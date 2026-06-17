import { Redis } from '@upstash/redis'
import { AlertCircle } from 'lucide-react'
import { Interview } from './Interview'

const redis = Redis.fromEnv()

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
    seedQuestions: string[]
}

export default async function InterviewPage({
    params,
}: {
    params: Promise<{ sessionId: string }>
}) {
    const { sessionId } = await params
    const session = await redis.get<Session>(`session:${sessionId}`)

    if (!session) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center px-6">
                <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                    <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center mb-1">
                        <AlertCircle size={14} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">Link not found</p>
                    <p className="text-[13px] text-muted leading-relaxed">
                        This session link is invalid or has expired. Check with the person who sent
                        it.
                    </p>
                </div>
            </main>
        )
    }

    const capSeconds = parseInt(process.env.ELEVENLABS_USAGE_CAP_SECONDS ?? '1800')
    if (session.creatorId) {
        const usedSeconds =
            (await redis.get<number>(`user:${session.creatorId}:usage:seconds`)) ?? 0
        if (usedSeconds >= capSeconds) {
            return (
                <main className="min-h-screen flex flex-col items-center justify-center px-6">
                    <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                        <p className="text-sm font-medium text-ink">Session unavailable</p>
                        <p className="text-[13px] text-muted leading-relaxed">
                            This interview session is currently unavailable. Please contact the
                            researcher.
                        </p>
                    </div>
                </main>
            )
        }
    }

    if (session.status === 'completed') {
        return (
            <main className="min-h-screen flex flex-col bg-bg">
                <header className="px-6 py-5">
                    <p className="text-[13px] font-medium text-muted tracking-wide">VoiceScope</p>
                </header>
                <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
                    <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                        <p className="text-lg font-semibold text-ink tracking-tight">Thanks for your time.</p>
                        <p className="text-[13px] text-muted leading-relaxed">
                            Your responses have been recorded.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    const project = await redis.get<Project>(`project:${session.projectId}`)
    if (!project) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center px-6">
                <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                    <p className="text-sm font-medium text-ink">Session unavailable</p>
                    <p className="text-[13px] text-muted leading-relaxed">
                        Please contact the researcher.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen flex flex-col bg-bg">
            <header className="px-6 py-5">
                <p className="text-[13px] font-medium text-muted tracking-wide">VoiceScope</p>
            </header>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
                <Interview
                    session={{
                        productName: project.productName,
                        productDescription: project.productDescription,
                        researchGoal: project.researchGoal,
                        seedQuestions: project.seedQuestions,
                        participantEmail: session.participantEmail,
                    }}
                    sessionId={sessionId}
                />
            </div>
        </main>
    )
}
