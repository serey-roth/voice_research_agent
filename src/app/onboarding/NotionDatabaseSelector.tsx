'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { selectNotionDatabase, createNotionDatabase } from '@/app/actions'

interface Database {
    id: string
    name: string
}

const CREATE_NEW = '__create__'

export function NotionDatabaseSelector({
    databases,
    currentId,
    onSuccess,
}: {
    databases: Database[]
    currentId?: string | null
    onSuccess?: () => void
}) {
    const options = [...databases, { id: CREATE_NEW, name: 'Create new database' }]
    const [selectedId, setSelectedId] = useState(currentId ?? databases[0]?.id ?? CREATE_NEW)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selected = options.find((o) => o.id === selectedId)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function handleConfirm() {
        if (!selectedId) return
        setLoading(true)
        try {
            if (selectedId === CREATE_NEW) {
                await createNotionDatabase()
            } else {
                await selectNotionDatabase(selectedId)
            }
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
                        {options.map((o, i) => (
                            <div key={o.id}>
                                {i === options.length - 1 && databases.length > 0 && (
                                    <div className="border-t border-neutral-100 my-1" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setSelectedId(o.id); setOpen(false) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-surface transition-colors text-left"
                                >
                                    <span className="flex-1">{o.name}</span>
                                    {o.id === currentId && o.id !== selectedId && (
                                        <span className="text-[10px] text-muted">Current</span>
                                    )}
                                    {o.id === selectedId && <Check size={12} className="text-primary shrink-0" strokeWidth={2.5} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleConfirm}
                disabled={loading || selectedId === currentId}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-bg text-[13px] font-medium rounded-[6px] transition-colors"
            >
                {loading ? 'Saving…' : 'Confirm'}
            </button>
        </div>
    )
}
