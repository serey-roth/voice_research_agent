'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil } from 'lucide-react'
import App from './App'
import { ProjectRow } from './ProjectRow'
import { DeleteModal } from './DeleteModal'
import { StatusBadge } from './StatusBadge'
import type { Project } from './ProjectRow'
import type { SessionStatus } from './StatusBadge'
import { createProject, updateProject, deleteProject, resetSession } from '@/app/actions'

interface FormState {
    productName: string
    productDescription: string
    researchGoal: string
    newEmails: string[]
}

type PanelMode = 'new' | 'view'

export default function Home({ projects, isOverCap }: { projects: Project[]; isOverCap: boolean }) {
    const router = useRouter()

    const [panelOpen, setPanelOpen] = useState(false)
    const [panelMode, setPanelMode] = useState<PanelMode>('new')

    const [currentProject, setCurrentProject] = useState<Project | null>(null)
    const [viewEditMode, setViewEditMode] = useState(false)

    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    function closePanel() {
        setPanelOpen(false)
        setCurrentProject(null)
        setPanelMode('new')
        setViewEditMode(false)
    }

    function openNewProject() {
        setCurrentProject(null)
        setPanelMode('new')
        setPanelOpen(true)
    }

    function openViewProject(project: Project) {
        setCurrentProject(project)
        setPanelMode('view')
        setPanelOpen(true)
        setOpenMenuId(null)
        setViewEditMode(false)
    }

    function openEditProject(project: Project) {
        setCurrentProject(project)
        setViewEditMode(true)
        setPanelMode('view')
        setPanelOpen(true)
        setOpenMenuId(null)
    }

    function startEditMode() {
        if (!currentProject) return
        setViewEditMode(true)
    }

    function cancelEdit() {
        setViewEditMode(false)
    }

    async function handleDelete(projectId: string) {
        setDeleteConfirmId(null)
        try {
            await deleteProject(projectId)
            closePanel()
            router.refresh()
        } catch {}
    }

    async function handleCreate(data: FormState): Promise<string | null> {
        try {
            await createProject(
                data.productName,
                data.productDescription,
                data.researchGoal,
                data.newEmails.filter((e) => e.trim())
            )
            router.refresh()
            closePanel()
            return null
        } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            return msg === 'Usage cap reached'
                ? "You've reached your usage limit. Visit Settings to learn more."
                : 'Something went wrong. Please try again.'
        }
    }

    async function handleSave(data: FormState): Promise<string | null> {
        if (!currentProject) return null
        try {
            const canEditFields = currentProject.sessions.every((s) => s.status === 'pending')
            const newEmails = data.newEmails.filter((e) => e.trim())

            const fieldUpdates = canEditFields
                ? { productDescription: data.productDescription, researchGoal: data.researchGoal }
                : {}

            const { sessions } = await updateProject(currentProject.id, {
                ...fieldUpdates,
                ...(newEmails.length ? { participantEmails: newEmails } : {}),
            })

            const newSessions = sessions.map((s) => ({
                id: s.id,
                participantEmail: s.participantEmail,
                status: 'pending' as SessionStatus,
                briefUrl: null,
                briefStatus: null,
            }))

            setCurrentProject((p) =>
                p ? { ...p, ...fieldUpdates, sessions: [...p.sessions, ...newSessions] } : null
            )
            setViewEditMode(false)
            router.refresh()
            return null
        } catch {
            return 'Something went wrong. Please try again.'
        }
    }

    const panelTitle =
        panelMode === 'view' ? (viewEditMode ? 'Edit project' : 'Project details') : 'New project'

    const header = (
        <>
            <h1 className="text-[15px] font-semibold text-ink mr-auto">Projects</h1>
            <button
                onClick={() => !isOverCap && openNewProject()}
                disabled={isOverCap}
                title={isOverCap ? 'Usage limit reached' : undefined}
                className="bg-primary hover:bg-primary-hover text-bg text-[13px] font-medium px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <span className="hidden sm:inline">+ New project</span>
                <span className="sm:hidden">+</span>
            </button>
        </>
    )

    return (
        <App header={header}>
            <div className="flex-1 overflow-y-auto">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 pb-16 px-6 text-center">
                        <p className="text-sm text-muted">No projects yet.</p>
                        {!isOverCap && (
                            <button
                                onClick={openNewProject}
                                className="text-[13px] text-primary hover:text-primary-hover transition-colors"
                            >
                                Create your first project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {projects.map((project) => (
                            <ProjectRow
                                key={project.id}
                                project={project}
                                openMenuId={openMenuId}
                                onMenuToggle={setOpenMenuId}
                                onView={() => openViewProject(project)}
                                onEdit={() => openEditProject(project)}
                                onRetry={() => router.refresh()}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div
                className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${
                    panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={closePanel}
            />

            <div
                className={`fixed right-0 top-0 h-full w-full sm:w-[440px] bg-bg border-l border-neutral-200 z-50 flex flex-col transition-transform duration-200 ease-out ${
                    panelOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="h-14 px-6 flex items-center justify-between border-b border-neutral-100 shrink-0">
                    <h2 className="text-[15px] font-semibold text-ink">{panelTitle}</h2>
                    <div className="flex items-center gap-1">
                        {panelMode === 'view' && !viewEditMode && currentProject && (
                            <button
                                onClick={startEditMode}
                                title={
                                    !currentProject.sessions.every((s) => s.status === 'pending')
                                        ? 'Project fields locked — interviews have started'
                                        : undefined
                                }
                                className="text-muted hover:text-ink transition-colors w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-neutral-100 outline-none"
                                aria-label="Edit project"
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        <button
                            onClick={closePanel}
                            className="text-muted hover:text-ink transition-colors w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-neutral-100 outline-none"
                            aria-label="Close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {panelMode === 'view' && currentProject && !viewEditMode ? (
                        <ViewPanel project={currentProject} />
                    ) : panelMode === 'view' && currentProject ? (
                        <ProjectFormBody
                            key={currentProject.id}
                            mode="edit"
                            project={currentProject}
                            onSubmit={handleSave}
                            onCancel={cancelEdit}
                        />
                    ) : (
                        <ProjectFormBody key="create" mode="create" onSubmit={handleCreate} />
                    )}
                </div>
            </div>

            {deleteConfirmId && (
                <DeleteModal
                    onConfirm={() => handleDelete(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            )}
        </App>
    )
}

function ViewPanel({ project }: { project: Project }) {
    const router = useRouter()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    Product
                </p>
                <p className="text-[13px] text-ink">{project.productName}</p>
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    Description
                </p>
                <p className="text-[13px] text-ink leading-relaxed">{project.productDescription}</p>
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    Research goal
                </p>
                <p className="text-[13px] text-ink leading-relaxed">{project.researchGoal}</p>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    Participants
                </p>
                {project.sessions.length === 0 ? (
                    <p className="text-[13px] text-muted italic">No participants yet.</p>
                ) : (
                    project.sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between gap-3">
                            <p className="text-[13px] text-ink truncate">
                                {session.participantEmail}
                            </p>
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
                                                router.refresh()
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
                    ))
                )}
            </div>

            {(project.issuesUrl || project.issuesStatus === 'failed') && (
                <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                        Issues
                    </p>
                    {project.issuesUrl ? (
                        <a
                            href={project.issuesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-primary hover:text-primary-hover transition-colors self-start"
                        >
                            View in Linear ↗
                        </a>
                    ) : (
                        <p className="text-[13px] text-red-400">Failed to create issues</p>
                    )}
                </div>
            )}
        </div>
    )
}

interface ProjectFormBodyProps {
    mode: 'create' | 'edit'
    project?: Project
    onSubmit: (data: FormState) => Promise<string | null>
    onCancel?: () => void
}

function ProjectFormBody({ mode, project, onSubmit, onCancel }: ProjectFormBodyProps) {
    const [loading, setLoading] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [form, setForm] = useState<FormState>({
        productName: project?.productName ?? '',
        productDescription: project?.productDescription ?? '',
        researchGoal: project?.researchGoal ?? '',
        newEmails: [],
    })

    async function handleSubmit() {
        setLoading(true)
        setFormError(null)
        const error = await onSubmit(form)
        if (error) setFormError(error)
        setLoading(false)
    }

    const existingSessions = project?.sessions ?? []
    const canEditFields = project?.sessions.every((s) => s.status === 'pending') ?? true

    function isEmailDupe(email: string, index: number): boolean {
        if (!email.trim()) return false
        const normalized = email.trim().toLowerCase()
        return (
            existingSessions.some((s) => s.participantEmail.toLowerCase() === normalized) ||
            form.newEmails.some(
                (other, j) => j !== index && other.trim().toLowerCase() === normalized
            )
        )
    }

    const hasDupe = form.newEmails.some((e, i) => isEmailDupe(e, i))

    const isDirty =
        mode === 'create' ||
        form.productDescription !== (project?.productDescription ?? '') ||
        form.researchGoal !== (project?.researchGoal ?? '') ||
        form.newEmails.some((e) => e.trim())

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
            }}
            className="flex flex-col gap-4"
        >
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">
                    Product name {mode === 'create' && <span className="text-red-400">*</span>}
                </label>
                {mode === 'create' ? (
                    <input
                        type="text"
                        required
                        value={form.productName}
                        onChange={(e) => setForm({ ...form, productName: e.target.value })}
                        className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg focus:outline-none focus:border-primary transition-colors"
                        placeholder="e.g. Loom"
                    />
                ) : (
                    <p className="text-[13px] text-ink">{project?.productName}</p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">
                    Product description{' '}
                    {mode === 'create' && <span className="text-red-400">*</span>}
                </label>
                {canEditFields ? (
                    <textarea
                        required={mode === 'create'}
                        value={form.productDescription}
                        onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
                        className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg resize-none focus:outline-none focus:border-primary transition-colors"
                        rows={2}
                        placeholder="One sentence about what your product does"
                    />
                ) : (
                    <p className="text-[13px] text-ink leading-relaxed">
                        {form.productDescription}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">
                    Research goal {mode === 'create' && <span className="text-red-400">*</span>}
                </label>
                {canEditFields && (
                    <p className="text-[12px] text-muted -mt-0.5">
                        The more focused the goal, the sharper the interview.
                    </p>
                )}
                {canEditFields ? (
                    <textarea
                        required={mode === 'create'}
                        value={form.researchGoal}
                        onChange={(e) => setForm({ ...form, researchGoal: e.target.value })}
                        className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg resize-none focus:outline-none focus:border-primary transition-colors"
                        rows={2}
                        placeholder="e.g. Understand why users drop off during onboarding"
                    />
                ) : (
                    <p className="text-[13px] text-ink leading-relaxed">{form.researchGoal}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Participants</label>
                {mode === 'create' && (
                    <p className="text-[12px] text-muted -mt-1">
                        Each participant gets their own unique interview link.
                    </p>
                )}
                {existingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3">
                        <p className="text-[13px] text-muted truncate">
                            {session.participantEmail}
                        </p>
                        <StatusBadge status={session.status} />
                    </div>
                ))}
                {form.newEmails.map((email, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    const updated = [...form.newEmails]
                                    updated[i] = e.target.value
                                    setForm({ ...form, newEmails: updated })
                                }}
                                className={`border rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg flex-1 focus:outline-none transition-colors ${
                                    isEmailDupe(email, i)
                                        ? 'border-red-300 focus:border-red-400'
                                        : 'border-neutral-200 focus:border-primary'
                                }`}
                                placeholder="participant@email.com"
                            />
                            {form.newEmails.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm({
                                            ...form,
                                            newEmails: form.newEmails.filter((_, j) => j !== i),
                                        })
                                    }
                                    aria-label="Remove"
                                    className="text-muted hover:text-ink transition-colors w-6 h-6 flex items-center justify-center shrink-0 outline-none"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {isEmailDupe(email, i) && (
                            <p className="text-[12px] text-red-400">Already a participant</p>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => setForm({ ...form, newEmails: [...form.newEmails, ''] })}
                    className="text-[13px] text-primary hover:text-primary-hover transition-colors self-start outline-none"
                >
                    + Add participant
                </button>
            </div>

            <div className="flex flex-col gap-2 mt-1">
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={loading || hasDupe || !isDirty}
                        className="bg-primary hover:bg-primary-hover disabled:bg-neutral-200 disabled:text-neutral-400 text-bg rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                        {loading
                            ? mode === 'create'
                                ? 'Creating…'
                                : 'Saving…'
                            : mode === 'create'
                              ? 'Create project'
                              : 'Save'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-2 text-[13px] text-ink border border-neutral-200 rounded-[6px] hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                {formError && <p className="text-[13px] text-red-500">{formError}</p>}
            </div>
        </form>
    )
}
