'use client'

import { User } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { SessionStatus } from './StatusBadge'
import { resetSession } from '@/app/actions'

export interface Session {
    id: string
    participantEmail: string
    status: SessionStatus
    briefUrl: string | null
    briefStatus: 'success' | 'failed' | null
    error?: string | null
}

export interface Project {
    id: string
    productName: string
    productDescription: string
    researchGoal: string
    createdAt: string
    sessions: Session[]
    issuesUrl: string | null
    issuesStatus: 'success' | 'failed' | null
}

interface ProjectRowProps {
    project: Project
    openMenuId: string | null
    onMenuToggle: (id: string | null) => void
    onView: () => void
    onEdit: () => void
    onDelete: () => void
    onRetry: () => void
}

export function ProjectRow({
    project,
    openMenuId,
    onMenuToggle,
    onView,
    onEdit,
    onDelete,
    onRetry,
}: ProjectRowProps) {
    const menuOpen = openMenuId === project.id

    return (
        <div className="px-4 lg:px-8 py-4 hover:bg-surface transition-colors duration-100">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{project.productName}</p>
                    <p className="text-[13px] text-muted mt-0.5">{project.productDescription}</p>
                    <p className="text-[12px] text-muted/60 mt-1 italic">{project.researchGoal}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {project.issuesUrl && (
                        <a
                            href={project.issuesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-primary hover:text-primary-hover transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Issues ↗
                        </a>
                    )}
                    <p className="text-[12px] text-muted">
                        {new Date(project.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>
                    <div className="relative">
                        <button
                            onClick={() => onMenuToggle(menuOpen ? null : project.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-muted hover:text-ink hover:bg-neutral-100 transition-colors outline-none"
                            aria-label="Project options"
                        >
                            ···
                        </button>
                        {menuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => onMenuToggle(null)}
                                />
                                <div className="absolute right-0 top-7 z-20 w-44 bg-bg border border-neutral-200 rounded-[6px] shadow-sm py-1 flex flex-col">
                                    <button
                                        onClick={onView}
                                        className="text-left px-3 py-1.5 text-[13px] text-ink hover:bg-neutral-50 transition-colors"
                                    >
                                        View details
                                    </button>
                                    <button
                                        onClick={onEdit}
                                        className="text-left px-3 py-1.5 text-[13px] text-ink hover:bg-neutral-50 transition-colors disabled:text-muted disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    >
                                        Edit project
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="text-left px-3 py-1.5 text-[13px] text-red-500 hover:bg-neutral-50 transition-colors"
                                    >
                                        Delete project
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {project.sessions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {project.sessions.slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <User size={11} className="text-muted shrink-0" />
                                <p className="text-[12px] text-muted truncate">
                                    {session.participantEmail}
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                                <StatusBadge
                                    status={session.status}
                                    title={
                                        session.status === 'failed' && session.error
                                            ? session.error
                                            : undefined
                                    }
                                />
                                {session.status === 'pending' && (
                                    <button
                                        onClick={() =>
                                            navigator.clipboard.writeText(
                                                `${window.location.origin}/interview/${session.id}`
                                            )
                                        }
                                        className="text-[12px] text-muted hover:text-ink transition-colors"
                                    >
                                        Copy link
                                    </button>
                                )}
                                {session.status === 'failed' && (
                                    <button
                                        onClick={() =>
                                            resetSession(session.id).then(() => {
                                                navigator.clipboard.writeText(
                                                    `${window.location.origin}/interview/${session.id}`
                                                )
                                                onRetry()
                                            })
                                        }
                                        className="text-[12px] text-muted hover:text-ink transition-colors"
                                    >
                                        Retry
                                    </button>
                                )}
                                {session.briefUrl ? (
                                    <a
                                        href={session.briefUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[12px] text-primary hover:text-primary-hover transition-colors"
                                    >
                                        Brief ↗
                                    </a>
                                ) : session.briefStatus === 'failed' ? (
                                    <span className="text-[12px] text-red-400">Brief failed</span>
                                ) : null}
                            </div>
                        </div>
                    ))}
                    {project.sessions.length > 3 && (
                        <p className="text-[12px] text-muted pl-0.5">
                            + {project.sessions.length - 3} more
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
