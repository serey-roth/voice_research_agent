'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function PendoInitializer({ usageSeconds }: { usageSeconds: number }) {
    const { isSignedIn, userId } = useAuth()
    const identifiedUserRef = useRef<string | null>(null)

    useEffect(() => {
        pendo.initialize({ visitor: { id: '' } })
    }, [])

    useEffect(() => {
        if (isSignedIn === true && userId) {
            pendo.identify({
                visitor: {
                    id: userId,
                    usage_seconds: usageSeconds,
                },
            })
            identifiedUserRef.current = userId
        } else if (isSignedIn === false && identifiedUserRef.current) {
            pendo.clearSession()
            identifiedUserRef.current = null
        }
    }, [isSignedIn, userId, usageSeconds])

    return null
}
