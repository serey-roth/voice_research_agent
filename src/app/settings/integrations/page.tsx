import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'
import { redirect } from 'next/navigation'
import { fetchNotionDatabases, fetchLinearTeams } from '@/app/actions'
import IntegrationsContent from './IntegrationsContent'

const redis = Redis.fromEnv()

export const revalidate = 0

export default async function IntegrationsPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const [notionToken, notionDatabaseId, linearToken, linearTeamId] = await Promise.all([
        redis.get<string>(`user:${userId}:notion_token`),
        redis.get<string>(`user:${userId}:notion_database_id`),
        redis.get<string>(`user:${userId}:linear_token`),
        redis.get<string>(`user:${userId}:linear_team_id`),
    ])

    const notionDatabases = notionToken ? await fetchNotionDatabases(notionToken) : []
    const linearTeams = linearToken ? await fetchLinearTeams(linearToken) : []

    return (
        <IntegrationsContent
            notionConnected={!!notionToken}
            notionDatabaseId={notionDatabaseId ?? null}
            notionDatabases={notionDatabases}
            linearConnected={!!linearToken}
            linearTeamId={linearTeamId ?? null}
            linearTeams={linearTeams}
        />
    )
}
