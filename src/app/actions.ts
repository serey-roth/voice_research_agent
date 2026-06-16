'use server'

import { auth } from '@clerk/nextjs/server'
import { Client } from '@notionhq/client'
import { LinearClient } from '@linear/sdk'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export type ToolStatus = 'success' | 'failed'

interface NotionBriefParams {
    product_name: string
    product_description: string
    research_goal: string
    participant_email: string
    date: string
    key_findings: string
    pain_points: string
    recommended_actions: string
    transcript_summary: string
}

interface PainPoint {
    title: string
    description: string
    priority: 1 | 2 | 3 | 4
}

interface TicketsParams {
    product_name: string
    pain_points: PainPoint[]
    date: string
}

async function getSessionCreator(sessionId: string): Promise<string | null> {
    const session = await redis.get<{ creatorId?: string }>(`session:${sessionId}`)
    return session?.creatorId ?? null
}

async function getNotionClient(
    userId: string
): Promise<{ client: Client; databaseId: string } | null> {
    const [token, databaseId] = await Promise.all([
        redis.get<string>(`user:${userId}:notion_token`),
        redis.get<string>(`user:${userId}:notion_database_id`),
    ])
    if (!token || !databaseId) return null
    return { client: new Client({ auth: token }), databaseId }
}

async function getLinearClient(
    userId: string
): Promise<{ client: LinearClient; teamId: string } | null> {
    const [token, teamId] = await Promise.all([
        redis.get<string>(`user:${userId}:linear_token`),
        redis.get<string>(`user:${userId}:linear_team_id`),
    ])
    if (!token || !teamId) return null
    return { client: new LinearClient({ accessToken: token }), teamId }
}

export async function createNotionBrief(
    params: NotionBriefParams,
    sessionId: string
): Promise<{ url: string | null; status: ToolStatus }> {
    try {
        const creatorId = await getSessionCreator(sessionId)
        if (!creatorId) return { url: null, status: 'failed' }

        const notion = await getNotionClient(creatorId)
        if (!notion) return { url: null, status: 'failed' }

        const {
            product_name,
            product_description,
            research_goal,
            participant_email,
            date,
            key_findings,
            pain_points,
            recommended_actions,
            transcript_summary,
        } = params

        const page = await notion.client.pages.create({
            parent: { database_id: notion.databaseId },
            properties: {
                'Brief Title': {
                    title: [{ text: { content: `${product_name} Research Brief` } }],
                },
                'Product Name': {
                    rich_text: [{ text: { content: product_name } }],
                },
                'Product Description': {
                    rich_text: [{ text: { content: product_description } }],
                },
                'Research Goal': {
                    rich_text: [{ text: { content: research_goal } }],
                },
                'Participant Email': {
                    email: participant_email,
                },
                'Interview Date': {
                    date: { start: date },
                },
            },
            children: [
                heading('Key Findings'),
                paragraph(key_findings),
                heading('Pain Points'),
                paragraph(pain_points),
                heading('Recommended Actions'),
                paragraph(recommended_actions),
                heading('Transcript Summary'),
                paragraph(transcript_summary),
            ],
        })

        const url = 'url' in page ? page.url : `https://notion.so/${page.id.replace(/-/g, '')}`
        return { url, status: 'success' }
    } catch (err) {
        console.error('notion error:', err)
        return { url: null, status: 'failed' }
    }
}

async function getOrCreateProject(
    linear: LinearClient,
    productName: string,
    teamId: string
): Promise<string> {
    const existing = await linear.projects({ filter: { name: { eq: productName } } })
    if (existing.nodes.length > 0) return existing.nodes[0].id
    const payload = await linear.createProject({ name: productName, teamIds: [teamId] })
    const project = await payload.project
    if (!project) throw new Error('Failed to create Linear project')
    return project.id
}

export async function createTickets(
    params: TicketsParams,
    sessionId: string
): Promise<{ count: number; url: string | null; status: ToolStatus }> {
    try {
        const [creatorId, session] = await Promise.all([
            getSessionCreator(sessionId),
            redis.get<{ participantEmail?: string }>(`session:${sessionId}`),
        ])
        if (!creatorId) return { count: 0, url: null, status: 'failed' }

        const linearCtx = await getLinearClient(creatorId)
        if (!linearCtx) return { count: 0, url: null, status: 'failed' }

        const { product_name, pain_points, date } = params

        if (!pain_points || pain_points.length === 0) {
            return { count: 0, url: null, status: 'success' }
        }

        const participantEmail = session?.participantEmail
        const { client: linear, teamId } = linearCtx
        const createdAt = date ? new Date(date) : undefined
        const projectId = await getOrCreateProject(linear, product_name, teamId)

        await Promise.all(
            pain_points.map((point) =>
                linear.createIssue({
                    teamId,
                    projectId,
                    title: point.title,
                    description: [
                        point.description,
                        participantEmail ? `\n---\n*Raised by: ${participantEmail}*` : '',
                    ]
                        .join('')
                        .trim(),
                    priority: point.priority,
                    createdAt,
                })
            )
        )

        const team = await linear.team(teamId)
        const url = `https://linear.app/team/${team.key}/projects/${projectId}`
        return { count: pain_points.length, url, status: 'success' }
    } catch (err) {
        console.error('linear error:', err)
        return { count: 0, url: null, status: 'failed' }
    }
}

export async function completeSession(
    sessionId: string,
    data: {
        notionUrl?: string | null
        ticketsUrl?: string | null
        notionStatus?: ToolStatus
        ticketsStatus?: ToolStatus
    }
) {
    const session = await redis.get<Record<string, unknown>>(`session:${sessionId}`)
    if (!session) return
    await redis.set(`session:${sessionId}`, {
        ...session,
        status: 'completed',
        notionUrl: session.notionUrl ?? data.notionUrl ?? null,
        notionStatus: session.notionStatus ?? data.notionStatus,
        ticketsUrl: session.ticketsUrl ?? data.ticketsUrl ?? null,
        ticketsStatus: session.ticketsStatus ?? data.ticketsStatus,
    })
}

function heading(text: string) {
    return {
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: { rich_text: [{ type: 'text' as const, text: { content: text } }] },
    }
}

function paragraph(text: string) {
    return {
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: { rich_text: [{ type: 'text' as const, text: { content: text } }] },
    }
}

export async function recordUsage(conversationId: string, sessionId: string) {
    try {
        const creatorId = await getSessionCreator(sessionId)
        if (!creatorId) return

        const eleven = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

        // ElevenLabs may not finalize callDurationSecs immediately after disconnect — retry with backoff
        let seconds = 0
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 3000))
            const conv = await eleven.conversationalAi.conversations.get(conversationId)
            seconds = Math.round(conv.metadata?.callDurationSecs ?? 0)
            if (seconds > 0) break
        }

        if (seconds > 0) {
            // duration stored as its own key — avoids read-modify-write race with completeSession
            await Promise.all([
                redis.incrby(`user:${creatorId}:usage:seconds`, seconds),
                redis.set(`session:${sessionId}:duration`, seconds),
            ])
        }
    } catch (err) {
        console.error('recordUsage error:', err)
    }
}

export async function disconnectNotion() {
    const { userId } = await auth()
    if (!userId) return

    await Promise.all([
        redis.del(`user:${userId}:notion_token`),
        redis.del(`user:${userId}:notion_database_id`),
    ])
}

export async function disconnectLinear() {
    const { userId } = await auth()
    if (!userId) return

    await Promise.all([
        redis.del(`user:${userId}:linear_token`),
        redis.del(`user:${userId}:linear_team_id`),
    ])
}
