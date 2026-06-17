'use client'

import { useConversation } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { Orb } from 'orb-ui'
import type { OrbState } from 'orb-ui'
import {
    createBrief,
    createIssues,
    completeSession,
    recordUsage,
    updateSessionStatus,
} from '@/app/actions'

interface Session {
    productName: string
    productDescription: string
    researchGoal: string
    seedQuestions: string[]
    participantEmail: string
}

const CONNECT_TIMEOUT_MS = 15000

export function Conversation({ session, sessionId }: { session: Session; sessionId: string }) {
    const hasStartedRef = useRef(false)
    const conversationIdRef = useRef<string | null>(null)
    const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [hasEnded, setHasEnded] = useState(false)
    const [micError, setMicError] = useState(false)
    const [sessionError, setSessionError] = useState(false)
    const [connectTimedOut, setConnectTimedOut] = useState(false)

    const clientTools = {
        create_brief: async (params: {
            product_name: string
            product_description: string
            research_goal: string
            participant_email: string
            date: string
            key_findings: string
            pain_points: string
            recommended_actions: string
            transcript_summary: string
        }) => {
            const { url, status } = await createBrief(params, sessionId)
            await completeSession(sessionId, { notionUrl: url, notionStatus: status })
            return url ?? ''
        },
        create_issues: async (params: {
            product_name: string
            date: string
            pain_points: {
                title: string
                description: string
                priority: 1 | 2 | 3 | 4
            }[]
        }) => {
            const { count, url, status } = await createIssues(params, sessionId)
            await completeSession(sessionId, { issuesUrl: url, issuesStatus: status })
            return JSON.stringify({ count, url })
        },
    }

    const conversation = useConversation({
        onConnect: ({ conversationId }) => {
            hasStartedRef.current = true
            conversationIdRef.current = conversationId
            if (connectTimeoutRef.current) {
                clearTimeout(connectTimeoutRef.current)
                connectTimeoutRef.current = null
            }
            updateSessionStatus(sessionId, 'active')
        },
        onDisconnect: () => {
            if (!hasStartedRef.current) return
            setHasEnded(true)
            completeSession(sessionId, {})
            updateSessionStatus(sessionId, 'completed')
            if (conversationIdRef.current) {
                recordUsage(conversationIdRef.current, sessionId)
            }
        },
        onError: (message: string) => {
            setSessionError(true)
            updateSessionStatus(sessionId, 'failed', message)
            if (connectTimeoutRef.current) {
                clearTimeout(connectTimeoutRef.current)
                connectTimeoutRef.current = null
            }
        },
    })

    const { status, isSpeaking } = conversation
    const isConnecting = status === 'connecting'
    const isConnected = status === 'connected'
    const isActive = isConnecting || isConnected

    // Best-effort: end session on tab close so onDisconnect fires and usage is recorded
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isActive) conversation.endSession()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [conversation, isActive])

    const startConversation = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true })
            setMicError(false)
            setSessionError(false)
            setConnectTimedOut(false)

            connectTimeoutRef.current = setTimeout(() => {
                conversation.endSession()
                setConnectTimedOut(true)
            }, CONNECT_TIMEOUT_MS)

            conversation.startSession({
                agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
                userId: sessionId,
                dynamicVariables: {
                    product_name: session.productName,
                    product_description: session.productDescription,
                    research_goal: session.researchGoal,
                    seed_questions: session.seedQuestions.join(', '),
                    participant_email: session.participantEmail,
                    current_date: new Date().toISOString().split('T')[0],
                },
                clientTools,
            })
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                setMicError(true)
            }
        }
    }

    const stopConversation = () => {
        conversation.endSession()
    }

    const orbState: OrbState = isConnecting
        ? 'connecting'
        : isConnected
          ? isSpeaking
              ? 'speaking'
              : 'listening'
          : 'idle'

    if (hasEnded) {
        return (
            <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                <p className="text-lg font-semibold text-ink tracking-tight">
                    Thanks for your time.
                </p>
                <p className="text-[13px] text-muted leading-relaxed">
                    Your feedback on {session.productName} has been recorded.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-12 text-center w-full max-w-xs">
            {/* Product context — fades out when active */}
            <div
                className={`flex flex-col gap-1.5 transition-opacity duration-300 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <p className="text-xs text-muted uppercase tracking-widest font-medium">
                    Voice Interview
                </p>
                <p className="text-2xl font-semibold text-ink tracking-tight leading-snug">
                    {session.productName}
                </p>
                <p className="text-[13px] text-muted leading-relaxed mt-1 max-w-[220px] mx-auto">
                    Share your honest thoughts — this is a short voice conversation.
                </p>
            </div>

            {/* Orb */}
            <div className="flex flex-col items-center gap-5">
                <div className="relative">
                    <Orb
                        state={orbState}
                        theme="circle"
                        size={152}
                        onStart={startConversation}
                        onStop={stopConversation}
                        aria-label={isActive ? 'End interview' : 'Start interview'}
                    />
                </div>

                <div className="h-4 flex items-center justify-center">
                    <p className="text-[13px] text-muted">
                        {isActive
                            ? isConnecting
                                ? 'Getting ready…'
                                : isSpeaking
                                  ? 'Speaking'
                                  : 'Listening'
                            : sessionError || connectTimedOut || micError
                              ? null
                              : 'Tap to begin'}
                    </p>
                </div>

                {(micError || sessionError || connectTimedOut) && (
                    <p className="text-[13px] text-red-500 max-w-[240px] leading-relaxed">
                        {micError
                            ? 'Microphone access was denied. Allow mic access in your browser settings and try again.'
                            : 'Something went wrong. Please refresh the page and try again.'}
                    </p>
                )}
            </div>
        </div>
    )
}
