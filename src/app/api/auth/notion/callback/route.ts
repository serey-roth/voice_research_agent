import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { setNotionAuth } from '@/lib/db'

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
    const returnTo = searchParams.get('state') ?? '/onboarding'
    const onboardingUrl = returnTo === '/onboarding'
        ? '/onboarding'
        : `/onboarding?returnTo=${encodeURIComponent(returnTo)}`

    if (!code) redirect(onboardingUrl)

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

    if (!res.ok) redirect(onboardingUrl)

    const data = await res.json()
    const accessToken = data.access_token as string

    await setNotionAuth(
        userId,
        accessToken,
        data.workspace_name ?? '',
        data.duplicated_template_id ?? undefined
    )

    redirect(onboardingUrl)
}
