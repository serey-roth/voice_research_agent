import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import App from '@/app/components/App'
import { getUserUsageSeconds, getUserProjectsWithSessions, getSessionDuration } from '@/lib/db'
import { DateTime } from 'luxon'

interface Session {
    participantEmail: string
    status: 'pending' | 'completed'
    createdAt: string
    projectId: string
    deletedAt?: string | null
}

interface Project {
    productName: string
    deletedAt?: string | null
}

export const revalidate = 0

export default async function UsagePage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const capSeconds = parseInt(process.env.ELEVENLABS_USAGE_CAP_SECONDS ?? '1800')
    const usedSeconds = await getUserUsageSeconds(userId!)

    const projectsWithSessions = await getUserProjectsWithSessions<Project, Session>(userId!)
    const allSessions = projectsWithSessions.flatMap((p) =>
        p.sessions.map((s) => ({ ...s, productName: p.productName }))
    )

    const completedSessions = allSessions
        .filter((s) => s.status === 'completed')
        .sort(
            (a, b) =>
                DateTime.fromISO(b.createdAt).toMillis() - DateTime.fromISO(a.createdAt).toMillis()
        )

    const completedWithDuration = await Promise.all(
        completedSessions.map(async (s) => {
            const durationSeconds = await getSessionDuration(s.id)
            return { ...s, durationSeconds: durationSeconds ?? 0 }
        })
    )

    const byProject = projectsWithSessions
        .filter((p) => !p.deletedAt)
        .map((p) => {
            const sessions = completedWithDuration.filter((s) => s.projectId === p.id)
            const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
            return {
                id: p.id,
                productName: p.productName,
                sessionCount: sessions.length,
                totalMinutes: Math.round(totalSeconds / 60),
            }
        })
        .filter((p) => p.sessionCount > 0)

    const usedMinutes = Math.round(usedSeconds / 60)
    const capMinutes = Math.round(capSeconds / 60)
    const remainingSeconds = Math.max(0, capSeconds - usedSeconds)
    const remainingMinutes = Math.round(remainingSeconds / 60)
    const isOverCap = usedSeconds >= capSeconds
    const usagePercent = Math.min(100, Math.round((usedSeconds / capSeconds) * 100))

    const header = <h1 className="text-[15px] font-semibold text-ink mr-auto">Usage</h1>

    return (
        <App header={header}>
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8">
                <div className="max-w-[640px] mx-auto flex flex-col gap-8">
                    {isOverCap && (
                        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                            <p className="text-sm font-medium text-red-800 mb-1">
                                You&apos;ve hit your limit
                            </p>
                            <p className="text-[13px] text-red-700 leading-relaxed">
                                New interviews are paused.{' '}
                                <a
                                    href={`mailto:${process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL}`}
                                    className="underline hover:no-underline"
                                >
                                    Reach out
                                </a>{' '}
                                and we&apos;ll get you more minutes.
                            </p>
                        </div>
                    )}

                    <section>
                        <h2 className="text-[11px] font-medium text-muted mb-4 uppercase tracking-wide">
                            Interview minutes
                        </h2>
                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                            <div className="p-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-2xl font-semibold text-ink tracking-tight">
                                        {usedMinutes}
                                        <span className="text-base font-normal text-muted ml-1">
                                            / {capMinutes} min
                                        </span>
                                    </p>
                                    <p className="text-[13px] text-muted mt-1">
                                        {isOverCap
                                            ? 'Limit reached'
                                            : `${remainingMinutes} min remaining`}
                                    </p>
                                </div>
                                <p className="text-[13px] text-muted shrink-0">{usagePercent}%</p>
                            </div>
                            <div className="h-1 bg-neutral-100">
                                <div
                                    className={`h-full transition-all ${isOverCap ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        </div>
                    </section>

                    {byProject.length > 0 && (
                        <section>
                            <h2 className="text-[11px] font-medium text-muted mb-4 uppercase tracking-wide">
                                By project
                            </h2>
                            <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100">
                                {byProject.map((p) => (
                                    <div
                                        key={p.id}
                                        className="px-5 py-3.5 flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-ink truncate">
                                                {p.productName}
                                            </p>
                                            <p className="text-[12px] text-muted mt-0.5">
                                                {p.sessionCount}{' '}
                                                {p.sessionCount === 1 ? 'interview' : 'interviews'}
                                            </p>
                                        </div>
                                        <span className="text-[13px] text-muted shrink-0">
                                            {p.totalMinutes} min
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {!isOverCap && (
                        <p className="text-[13px] text-muted">
                            Need more minutes?{' '}
                            <a
                                href={`mailto:${process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL}`}
                                className="text-primary hover:text-primary-hover transition-colors"
                            >
                                Contact us
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </App>
    )
}
