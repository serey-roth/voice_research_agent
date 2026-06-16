import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const POST = async (request: Request) => {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { productName, productDescription, researchGoal, seedQuestions, participantEmails } = body

    if (
        typeof productName !== 'string' ||
        !productName.trim() ||
        typeof productDescription !== 'string' ||
        !productDescription.trim() ||
        typeof researchGoal !== 'string' ||
        !researchGoal.trim() ||
        !Array.isArray(seedQuestions) ||
        seedQuestions.length === 0 ||
        !seedQuestions.every((q) => typeof q === 'string') ||
        !Array.isArray(participantEmails) ||
        participantEmails.length === 0 ||
        !participantEmails.every((e) => typeof e === 'string' && e.trim())
    ) {
        return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const capSeconds = parseInt(process.env.ELEVENLABS_USAGE_CAP_SECONDS ?? '1800')
    const usedSeconds = (await redis.get<number>(`user:${userId}:usage:seconds`)) ?? 0
    if (usedSeconds >= capSeconds) {
        return Response.json({ error: 'Usage cap reached' }, { status: 403 })
    }

    const projectId = crypto.randomUUID()

    const project = {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        researchGoal: researchGoal.trim(),
        seedQuestions: seedQuestions.map((q: string) => q.trim()).filter(Boolean),
        creatorId: userId,
        createdAt: new Date().toISOString(),
    }

    const emails = (participantEmails as string[]).map((e) => e.trim().toLowerCase())
    const sessions = emails.map((email) => ({
        id: crypto.randomUUID(),
        data: {
            projectId,
            participantEmail: email,
            creatorId: userId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            notionUrl: null,
            ticketsUrl: null,
            notionStatus: null,
            ticketsStatus: null,
        },
    }))

    await Promise.all([
        redis.set(`project:${projectId}`, project),
        redis.lpush(`projects:user:${userId}`, projectId),
        ...sessions.map((s) => redis.set(`session:${s.id}`, s.data)),
        sessions.length > 0
            ? redis.lpush(`sessions:project:${projectId}`, ...sessions.map((s) => s.id))
            : Promise.resolve(),
    ])

    return Response.json({
        projectId,
        sessions: sessions.map((s) => ({
            id: s.id,
            participantEmail: s.data.participantEmail,
        })),
    })
}
