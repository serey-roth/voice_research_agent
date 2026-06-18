import { AlertCircle } from 'lucide-react'
import { Interview } from './Interview'
import { getSession, getUserUsageSeconds, getProject } from '@/lib/db'
import { AppLogo } from '@/app/components/AppLogo'
import React from 'react'

interface Session {
    projectId: string
    participantEmail: string
    status: 'pending' | 'completed'
    creatorId?: string
}

interface Project {
    productName: string
    productDescription: string
    researchGoal: string
}

function InterviewLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen flex flex-col bg-bg">
            <header className="flex items-center justify-between px-8 py-2 border-b border-black/5">
                <div className="flex items-center">
                    <span className="mt-1">
                        <AppLogo size={30} />
                    </span>
                    <span className="text-sm font-semibold tracking-tight">VoiceScope</span>
                </div>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
                {children}
            </div>

            <div className="border-t border-black/5" />

            <footer className="px-8 py-2 flex items-center justify-between">
                <span className="text-xs text-muted">© {new Date().getFullYear()} Voice Scope</span>
            </footer>
        </main>
    )
}

export default async function InterviewPage({
    params,
}: {
    params: Promise<{ sessionId: string }>
}) {
    const { sessionId } = await params
    const session = await getSession<Session>(sessionId)

    if (!session) {
        return (
            <InterviewLayout>
                <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                    <div className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center mb-1">
                        <AlertCircle size={14} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">Link not found</p>
                    <p className="text-[13px] text-muted leading-relaxed">
                        This session link is invalid or has expired. Check with the person who sent
                        it.
                    </p>
                </div>
            </InterviewLayout>
        )
    }

    const capSeconds = parseInt(process.env.ELEVENLABS_USAGE_CAP_SECONDS ?? '1800')
    if (session.creatorId) {
        const usedSeconds = await getUserUsageSeconds(session.creatorId)
        if (usedSeconds >= capSeconds) {
            return (
                <InterviewLayout>
                    <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                        <p className="text-sm font-medium text-ink">Session unavailable</p>
                        <p className="text-[13px] text-muted leading-relaxed">
                            This interview session is currently unavailable. Please contact the
                            researcher.
                        </p>
                    </div>
                </InterviewLayout>
            )
        }
    }

    if (session.status === 'completed') {
        return (
            <main className="min-h-screen flex flex-col bg-bg">
                <header className="px-6 py-5">
                    <AppLogo size={30} />
                </header>
                <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
                    <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                        <p className="text-lg font-semibold text-ink tracking-tight">
                            Thanks for your time.
                        </p>
                        <p className="text-[13px] text-muted leading-relaxed">
                            Your responses have been recorded.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    const project = await getProject<Project>(session.projectId)
    if (!project) {
        return (
            <InterviewLayout>
                <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                    <p className="text-sm font-medium text-ink">Session unavailable</p>
                    <p className="text-[13px] text-muted leading-relaxed">
                        Please contact the researcher.
                    </p>
                </div>
            </InterviewLayout>
        )
    }

    return (
        <InterviewLayout>
            <Interview
                session={{
                    productName: project.productName,
                    productDescription: project.productDescription,
                    researchGoal: project.researchGoal,
                    participantEmail: session.participantEmail,
                }}
                sessionId={sessionId}
            />
        </InterviewLayout>
    )
}
