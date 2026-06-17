'use client'

import { useRouter } from 'next/navigation'
import { NotionDatabaseSelector } from './NotionDatabaseSelector'
import { LinearTeamSelector } from './LinearTeamSelector'

interface Database {
    id: string
    name: string
}

interface Team {
    id: string
    name: string
}

export function OnboardingNotionDatabaseSelector({ databases }: { databases: Database[] }) {
    const router = useRouter()
    return <NotionDatabaseSelector databases={databases} onSuccess={() => router.push('/onboarding')} />
}

export function OnboardingLinearTeamSelector({ teams }: { teams: Team[] }) {
    const router = useRouter()
    return <LinearTeamSelector teams={teams} onSuccess={() => router.push('/onboarding')} />
}
