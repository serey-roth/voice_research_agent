'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import App from '@/app/components/App'
import { disconnectNotion, disconnectLinear } from '@/app/actions'
import { NotionDatabaseSelector } from '@/app/onboarding/NotionDatabaseSelector'
import { LinearTeamSelector } from '@/app/onboarding/LinearTeamSelector'

interface Props {
    notionConnected: boolean
    notionDatabaseId: string | null
    notionDatabases: { id: string; name: string }[]
    linearConnected: boolean
    linearTeamId: string | null
    linearTeams: { id: string; name: string }[]
}

export default function IntegrationsContent({
    notionConnected,
    notionDatabaseId,
    notionDatabases,
    linearConnected,
    linearTeamId,
    linearTeams,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleDisconnectNotion() {
        startTransition(async () => {
            await disconnectNotion()
            router.refresh()
        })
    }

    function handleDisconnectLinear() {
        startTransition(async () => {
            await disconnectLinear()
            router.refresh()
        })
    }

    const header = <h1 className="text-[15px] font-semibold text-ink mr-auto">Integrations</h1>

    return (
        <App header={header}>
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8">
                <div className="max-w-[640px] mx-auto flex flex-col gap-4">
                    <div className="border border-neutral-200 rounded-lg p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-6">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-ink">Notion</p>
                                        {notionConnected && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-muted">
                                                Connected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-muted leading-relaxed">
                                        Research briefs are saved to your Notion workspace after every
                                        interview.
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-3 pt-0.5">
                                    {notionConnected ? (
                                        <button
                                            onClick={handleDisconnectNotion}
                                            disabled={isPending}
                                            className="text-[13px] text-muted hover:text-red-600 transition-colors disabled:opacity-50"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <a
                                            href="/api/auth/notion"
                                            className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors"
                                        >
                                            Connect
                                        </a>
                                    )}
                                </div>
                        </div>
                        {notionConnected && (
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[13px] text-muted">
                                    {notionDatabaseId ? 'Change database:' : 'Select a database:'}
                                </p>
                                <NotionDatabaseSelector
                                    databases={notionDatabases}
                                    currentId={notionDatabaseId}
                                    onSuccess={() => router.refresh()}
                                />
                            </div>
                        )}
                    </div>

                    <div className="border border-neutral-200 rounded-lg p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-6">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-ink">Linear</p>
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-neutral-200 text-muted">
                                            Optional
                                        </span>
                                        {linearConnected && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-muted">
                                                Connected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-muted leading-relaxed">
                                        Pain points from interviews are automatically created as issues
                                        in Linear.
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-3 pt-0.5">
                                    {linearConnected ? (
                                        <button
                                            onClick={handleDisconnectLinear}
                                            disabled={isPending}
                                            className="text-[13px] text-muted hover:text-red-600 transition-colors disabled:opacity-50"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <a
                                            href="/api/auth/linear"
                                            className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors"
                                        >
                                            Connect
                                        </a>
                                    )}
                                </div>
                        </div>
                        {linearConnected && (
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[13px] text-muted">
                                    {linearTeamId ? 'Change team:' : 'Select a team:'}
                                </p>
                                <LinearTeamSelector
                                    teams={linearTeams}
                                    currentId={linearTeamId}
                                    onSuccess={() => router.refresh()}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </App>
    )
}
