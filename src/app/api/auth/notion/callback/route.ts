import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'
import { redirect } from 'next/navigation'

const redis = Redis.fromEnv()

export async function GET(request: Request) {
    const { userId } = await auth()
    if (!userId) return new Response('Unauthorized', { status: 401 })

    const clientId = process.env.NOTION_CLIENT_ID
    const clientSecret = process.env.NOTION_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!clientId || !clientSecret || !appUrl)
        return new Response('Notion integration is not configured', { status: 500 })

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (!code) redirect('/onboarding')

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const res = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${appUrl}/api/auth/notion/callback`,
        }),
    })

    if (!res.ok) redirect('/onboarding')

    const data = await res.json()
    const accessToken = data.access_token as string

    await Promise.all([
        redis.set(`user:${userId}:notion_token`, accessToken),
        redis.set(`user:${userId}:notion_workspace`, data.workspace_name ?? ''),
        // Store template page so createNotionDatabase knows where to put the new db
        data.duplicated_template_id
            ? redis.set(`user:${userId}:notion_template_page_id`, data.duplicated_template_id)
            : Promise.resolve(),
    ])

    redirect('/onboarding')
}
