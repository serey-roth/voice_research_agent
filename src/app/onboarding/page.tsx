import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchNotionDatabases, fetchLinearTeams } from '@/app/actions'
import { OnboardingLinearTeamSelector, OnboardingNotionDatabaseSelector } from './OnboardingSelectors'

const redis = Redis.fromEnv()

export const revalidate = 0

export default async function OnboardingPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const [notionToken, notionDatabaseId, linearToken, linearTeamId] = await Promise.all([
        redis.get<string>(`user:${userId}:notion_token`),
        redis.get<string>(`user:${userId}:notion_database_id`),
        redis.get<string>(`user:${userId}:linear_token`),
        redis.get<string>(`user:${userId}:linear_team_id`),
    ])

    const notionConnected = !!notionToken && !!notionDatabaseId
    const pendingNotionDbSelection = !!notionToken && !notionDatabaseId
    const linearConnected = !!linearToken
    const pendingLinearTeamSelection = linearConnected && !linearTeamId

    const notionDatabases = pendingNotionDbSelection ? await fetchNotionDatabases(notionToken!) : []
    const linearTeams = linearToken ? await fetchLinearTeams(linearToken) : []

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[440px]">
                <div className="mb-10">
                    <h1 className="text-2xl font-semibold tracking-tight text-ink mb-1">
                        Connect your tools
                    </h1>
                    <p className="text-sm text-muted">
                        Set up your workspace before running interviews.
                    </p>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="p-5 rounded-lg border border-neutral-200 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-ink">Notion</p>
                                <p className="text-[13px] text-muted mt-0.5">
                                    A research brief is saved to your Notion workspace after every
                                    interview — key findings, pain points, and recommended actions.
                                </p>
                            </div>
                            {notionConnected && (
                                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface text-muted">
                                    Connected
                                </span>
                            )}
                        </div>
                        {!notionToken && (
                            <div className="flex items-center gap-3">
                                <a
                                    href="/api/auth/notion"
                                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-medium rounded-[6px] transition-colors"
                                >
                                    Connect Notion
                                </a>
                                <a
                                    href="https://notion.so"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-muted hover:text-ink transition-colors"
                                >
                                    Don&apos;t have Notion?
                                </a>
                            </div>
                        )}
                        {pendingNotionDbSelection && (
                            <div className="flex flex-col gap-2">
                                <p className="text-[13px] text-muted">Select a database for briefs:</p>
                                <OnboardingNotionDatabaseSelector databases={notionDatabases} />
                            </div>
                        )}
                    </div>

                    <div className="p-5 rounded-lg border border-neutral-200 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-medium text-ink">Linear</p>
                                    <span className="text-[11px] text-muted border border-neutral-200 px-1.5 py-0.5 rounded-full">
                                        Optional
                                    </span>
                                </div>
                                <p className="text-[13px] text-muted">
                                    Specific pain points raised during the interview are
                                    automatically created as issues in your Linear workspace.
                                </p>
                            </div>
                            {linearConnected && !pendingLinearTeamSelection && (
                                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface text-muted">
                                    Connected
                                </span>
                            )}
                        </div>
                        {!linearConnected && (
                            <div className="flex items-center gap-3">
                                <a
                                    href="/api/auth/linear"
                                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-medium rounded-[6px] transition-colors"
                                >
                                    Connect Linear
                                </a>
                                <a
                                    href="https://linear.app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-muted hover:text-ink transition-colors"
                                >
                                    Don&apos;t have Linear?
                                </a>
                            </div>
                        )}
                        {pendingLinearTeamSelection && (
                            <div className="flex flex-col gap-2">
                                <p className="text-[13px] text-muted">Select a team for issues:</p>
                                <OnboardingLinearTeamSelector teams={linearTeams} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    {notionConnected && !pendingLinearTeamSelection ? (
                        <Link
                            href="/"
                            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-[6px] transition-colors inline-block"
                        >
                            Continue
                        </Link>
                    ) : pendingNotionDbSelection ? (
                        <p className="text-[13px] text-muted">Select a Notion database to continue.</p>
                    ) : pendingLinearTeamSelection ? (
                        <p className="text-[13px] text-muted">Select a Linear team to continue.</p>
                    ) : (
                        <p className="text-[13px] text-muted">Connect Notion to continue.</p>
                    )}
                </div>
            </div>
        </main>
    )
}
