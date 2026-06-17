import { auth } from '@clerk/nextjs/server'
import { Redis } from '@upstash/redis'
import { redirect } from 'next/navigation'

const redis = Redis.fromEnv()

export async function GET(request: Request) {
    const { userId } = await auth()
    if (!userId) return new Response('Unauthorized', { status: 401 })

    const clientId = process.env.LINEAR_CLIENT_ID
    const clientSecret = process.env.LINEAR_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!clientId || !clientSecret || !appUrl)
        return new Response('Linear integration is not configured', { status: 500 })

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (!code) redirect('/onboarding')

    const res = await fetch('https://api.linear.app/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${appUrl}/api/auth/linear/callback`,
            code,
            grant_type: 'authorization_code',
        }),
    })

    if (!res.ok) redirect('/onboarding')

    const data = await res.json()
    const accessToken = data.access_token as string

    await redis.set(`user:${userId}:linear_token`, accessToken)
    redirect('/onboarding')
}
