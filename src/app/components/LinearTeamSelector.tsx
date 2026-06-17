'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { selectLinearTeam } from '@/app/actions'


interface Team {
    id: string
    name: string
}

export function LinearTeamSelector({
    teams,
    currentId,
    onSuccess,
}: {
    teams: Team[]
    currentId?: string | null
    onSuccess?: () => void
}) {
    const [selectedId, setSelectedId] = useState(currentId ?? teams[0]?.id ?? '')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selected = teams.find((t) => t.id === selectedId)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function handleConfirm() {
        if (!selectedId) return
        setLoading(true)
        try {
            await selectLinearTeam(selectedId)
            onSuccess?.()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <div ref={ref} className="relative flex-1">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="w-full flex items-center gap-2 border border-neutral-200 rounded-[6px] px-3 py-1.5 text-[13px] text-ink bg-bg hover:border-neutral-300 focus:outline-none focus:border-primary transition-colors"
                >
                    <span className="flex-1 text-left">{selected?.name}</span>
                    <ChevronDown size={13} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute top-full left-0 mt-1 w-max min-w-full bg-bg border border-neutral-200 rounded-[8px] shadow-sm py-1 z-10">
                        {teams.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => { setSelectedId(t.id); setOpen(false) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-surface transition-colors text-left"
                            >
                                <span className="flex-1">{t.name}</span>
                                {t.id === currentId && t.id !== selectedId && (
                                    <span className="text-[10px] text-muted">Current</span>
                                )}
                                {t.id === selectedId && <Check size={12} className="text-primary shrink-0" strokeWidth={2.5} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleConfirm}
                disabled={loading || !selectedId || selectedId === currentId}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-bg text-[13px] font-medium rounded-[6px] transition-colors"
            >
                {loading ? 'Saving…' : 'Confirm'}
            </button>
        </div>
    )
}
