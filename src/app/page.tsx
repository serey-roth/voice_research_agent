import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'
import { redirect } from 'next/navigation'
import Home from '@/app/components/Home'

const redis = Redis.fromEnv()

interface Project {
    productName: string
    productDescription: string
    researchGoal: string
    seedQuestions: string[]
    createdAt: string
    updatedAt: string
    deletedAt: string | null
}

interface Session {
    participantEmail: string
    status: 'pending' | 'active' | 'completed' | 'failed'
    notionUrl: string | null
    issuesUrl: string | null
    notionStatus: 'success' | 'failed' | null
    issuesStatus: 'success' | 'failed' | null
    deletedAt?: string | null
}

export const revalidate = 0

export default async function HomePage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const notionToken = await redis.get(`user:${userId}:notion_token`)
    if (!notionToken) redirect('/onboarding')

    const capSeconds = parseInt(process.env.ELEVENLABS_USAGE_CAP_SECONDS ?? '1800')
    const usedSeconds = (await redis.get<number>(`user:${userId}:usage:seconds`)) ?? 0
    const isOverCap = usedSeconds >= capSeconds

    const projectIds = await redis.lrange<string>(`projects:user:${userId}`, 0, -1)

    const projects = projectIds.length
        ? await Promise.all(
              projectIds.map(async (projectId) => {
                  const project = await redis.get<Project>(`project:${projectId}`)
                  if (!project || project.deletedAt) return null

                  const sessionIds = await redis.lrange<string>(
                      `sessions:project:${projectId}`,
                      0,
                      -1
                  )
                  const sessions = sessionIds.length
                      ? ((
                            await Promise.all(
                                sessionIds.map(async (id) => {
                                    const s = await redis.get<Session>(`session:${id}`)
                                    return s && !s.deletedAt ? { id, ...s } : null
                                })
                            )
                        ).filter(Boolean) as ({ id: string } & Session)[])
                      : []

                  return {
                      id: projectId,
                      productName: project.productName,
                      productDescription: project.productDescription,
                      researchGoal: project.researchGoal,
                      seedQuestions: project.seedQuestions,
                      createdAt: project.createdAt,
                      sessions,
                  }
              })
          )
        : []

    const valid = (projects.filter(Boolean) as NonNullable<(typeof projects)[number]>[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return <Home projects={valid} isOverCap={isOverCap} />
}
