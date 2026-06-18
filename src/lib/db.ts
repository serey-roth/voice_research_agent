import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function getUserIntegrations(userId: string) {
    const [notionToken, notionDatabaseId, linearToken, linearTeamId] = await Promise.all([
        redis.get<string>(`user:${userId}:notion_token`),
        redis.get<string>(`user:${userId}:notion_database_id`),
        redis.get<string>(`user:${userId}:linear_token`),
        redis.get<string>(`user:${userId}:linear_team_id`),
    ])
    return { notionToken, notionDatabaseId, linearToken, linearTeamId }
}

export async function getNotionToken(userId: string): Promise<string | null> {
    return redis.get<string>(`user:${userId}:notion_token`)
}

export async function getNotionCredentials(
    userId: string
): Promise<{ token: string; databaseId: string } | null> {
    const [token, databaseId] = await Promise.all([
        redis.get<string>(`user:${userId}:notion_token`),
        redis.get<string>(`user:${userId}:notion_database_id`),
    ])
    if (!token || !databaseId) return null
    return { token, databaseId }
}

export async function getNotionTemplatePageId(userId: string): Promise<string | null> {
    return redis.get<string>(`user:${userId}:notion_template_page_id`)
}

export async function setNotionDatabaseId(userId: string, databaseId: string): Promise<void> {
    await redis.set(`user:${userId}:notion_database_id`, databaseId)
}

export async function setNotionAuth(
    userId: string,
    token: string,
    workspaceName: string,
    templatePageId?: string
): Promise<void> {
    await Promise.all([
        redis.set(`user:${userId}:notion_token`, token),
        redis.set(`user:${userId}:notion_workspace`, workspaceName),
        templatePageId
            ? redis.set(`user:${userId}:notion_template_page_id`, templatePageId)
            : Promise.resolve(),
    ])
}

export async function disconnectNotion(userId: string): Promise<void> {
    await Promise.all([
        redis.del(`user:${userId}:notion_token`),
        redis.del(`user:${userId}:notion_database_id`),
        redis.del(`user:${userId}:notion_template_page_id`),
        redis.del(`user:${userId}:notion_workspace`),
    ])
}

export async function getLinearCredentials(
    userId: string
): Promise<{ token: string; teamId: string } | null> {
    const [token, teamId] = await Promise.all([
        redis.get<string>(`user:${userId}:linear_token`),
        redis.get<string>(`user:${userId}:linear_team_id`),
    ])
    if (!token || !teamId) return null
    return { token, teamId }
}

export async function setLinearToken(userId: string, token: string): Promise<void> {
    await redis.set(`user:${userId}:linear_token`, token)
}

export async function setLinearTeamId(userId: string, teamId: string): Promise<void> {
    await redis.set(`user:${userId}:linear_team_id`, teamId)
}

export async function disconnectLinear(userId: string): Promise<void> {
    await Promise.all([
        redis.del(`user:${userId}:linear_token`),
        redis.del(`user:${userId}:linear_team_id`),
    ])
}

export async function getUserUsageSeconds(userId: string): Promise<number> {
    return (await redis.get<number>(`user:${userId}:usage:seconds`)) ?? 0
}

export async function incrementUserUsageSeconds(userId: string, seconds: number): Promise<void> {
    await redis.incrby(`user:${userId}:usage:seconds`, seconds)
}

export async function getProject<T extends object>(projectId: string): Promise<T | null> {
    return redis.get<T>(`project:${projectId}`)
}

export async function setProject(projectId: string, data: object): Promise<void> {
    await redis.set(`project:${projectId}`, data)
}

export async function getUserProjectIds(userId: string): Promise<string[]> {
    return redis.lrange<string>(`projects:user:${userId}`, 0, -1)
}

export async function getUserProjects<T extends { deletedAt?: string | null }>(
    userId: string
): Promise<({ id: string } & T)[]> {
    const ids = await getUserProjectIds(userId)
    if (!ids.length) return []
    const projects = await Promise.all(ids.map((id) => getProject<T>(id)))
    return projects
        .map((p, i) => (p ? { id: ids[i], ...p } : null))
        .filter((p): p is { id: string } & Awaited<T> => p !== null && !p.deletedAt)
}

export async function getUserProjectsWithSessions<
    P extends { deletedAt?: string | null },
    S extends { deletedAt?: string | null } = { deletedAt?: string | null },
>(userId: string): Promise<Array<{ id: string } & P & { sessions: Array<{ id: string } & S> }>> {
    type ProjectWithSessions = { id: string } & P & { sessions: Array<{ id: string } & S> }
    const projects = await getUserProjects<P>(userId)
    return Promise.all(
        projects.map(async (project): Promise<ProjectWithSessions> => {
            const sessionIds = await getProjectSessionIds(project.id)
            const sessions = (
                await Promise.all(
                    sessionIds.map(async (id) => {
                        const s = await getSession<S>(id)
                        return s && !s.deletedAt ? ({ id, ...s } as { id: string } & S) : null
                    })
                )
            ).filter(Boolean) as Array<{ id: string } & S>
            return { ...project, sessions } as ProjectWithSessions
        })
    )
}

export async function addUserProject(userId: string, projectId: string): Promise<void> {
    await redis.lpush(`projects:user:${userId}`, projectId)
}

export async function getSession<T extends object>(sessionId: string): Promise<T | null> {
    return redis.get<T>(`session:${sessionId}`)
}

export async function setSession(sessionId: string, data: object): Promise<void> {
    await redis.set(`session:${sessionId}`, data)
}

export async function getSessionDuration(sessionId: string): Promise<number | null> {
    return redis.get<number>(`session:${sessionId}:duration`)
}

export async function setSessionDuration(sessionId: string, seconds: number): Promise<void> {
    await redis.set(`session:${sessionId}:duration`, seconds)
}

export async function getProjectSessionIds(projectId: string): Promise<string[]> {
    return redis.lrange<string>(`sessions:project:${projectId}`, 0, -1)
}

export async function addProjectSessionIds(projectId: string, ...ids: string[]): Promise<void> {
    await redis.lpush(`sessions:project:${projectId}`, ...ids)
}

export async function deleteUserData(userId: string): Promise<void> {
    const projectIds = await getUserProjectIds(userId)

    const allSessionIds: string[] = []
    if (projectIds.length) {
        const perProject = await Promise.all(
            projectIds.map((id) => redis.lrange<string>(`sessions:project:${id}`, 0, -1))
        )
        allSessionIds.push(...perProject.flat())
    }

    await Promise.all([
        redis.del(`projects:user:${userId}`),
        redis.del(`user:${userId}:notion_token`),
        redis.del(`user:${userId}:notion_database_id`),
        redis.del(`user:${userId}:notion_workspace`),
        redis.del(`user:${userId}:notion_template_page_id`),
        redis.del(`user:${userId}:linear_token`),
        redis.del(`user:${userId}:linear_team_id`),
        redis.del(`user:${userId}:usage:seconds`),
        ...projectIds.flatMap((id) => [
            redis.del(`project:${id}`),
            redis.del(`sessions:project:${id}`),
        ]),
        ...allSessionIds.flatMap((id) => [
            redis.del(`session:${id}`),
            redis.del(`session:${id}:duration`),
        ]),
    ])
}
