'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil } from 'lucide-react'
import App from './App'
import { ProjectRow } from './ProjectRow'
import { DeleteModal } from './DeleteModal'
import { StatusBadge } from './StatusBadge'
import type { Project, Session } from './ProjectRow'
import type { SessionStatus } from './StatusBadge'
import { createProject, updateProject, deleteProject } from '@/app/actions'

interface FormFields {
    productName: string
    productDescription: string
    researchGoal: string
    seedQuestions: string[]
    participantEmails: string[]
}

const DEFAULT_FORM: FormFields = {
    productName: '',
    productDescription: '',
    researchGoal: '',
    seedQuestions: ['', '', ''],
    participantEmails: [''],
}

type PanelMode = 'new' | 'view'

function projectToForm(project: Project): FormFields {
    return {
        productName: project.productName,
        productDescription: project.productDescription,
        researchGoal: project.researchGoal,
        seedQuestions: project.seedQuestions.length > 0 ? project.seedQuestions : [''],
        participantEmails: [''],
    }
}

export default function Home({ projects, isOverCap }: { projects: Project[]; isOverCap: boolean }) {
    const router = useRouter()

    const [panelOpen, setPanelOpen] = useState(false)
    const [panelMode, setPanelMode] = useState<PanelMode>('new')
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState<FormFields>(DEFAULT_FORM)
    const [viewedProject, setViewedProject] = useState<Project | null>(null)
    const [viewEditMode, setViewEditMode] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    function closePanel() {
        setPanelOpen(false)
        setForm(DEFAULT_FORM)
        setCurrentProjectId(null)
        setViewedProject(null)
        setPanelMode('new')
        setViewEditMode(false)
    }

    function openNewProject() {
        setForm(DEFAULT_FORM)
        setCurrentProjectId(null)
        setPanelMode('new')
        setPanelOpen(true)
    }

    function openViewProject(project: Project) {
        setViewedProject(project)
        setCurrentProjectId(project.id)
        setPanelMode('view')
        setPanelOpen(true)
        setOpenMenuId(null)
        setViewEditMode(false)
    }

    function openEditProject(project: Project) {
        setViewedProject(project)
        setCurrentProjectId(project.id)
        setForm(projectToForm(project))
        setViewEditMode(true)
        setPanelMode('view')
        setPanelOpen(true)
        setOpenMenuId(null)
    }

    function startEditMode() {
        if (!viewedProject) return
        setForm(projectToForm(viewedProject))
        setViewEditMode(true)
    }

    function cancelEdit() {
        setViewEditMode(false)
        setForm(DEFAULT_FORM)
    }

    async function handleDelete(projectId: string) {
        setDeleteConfirmId(null)
        await deleteProject(projectId)
        closePanel()
        router.refresh()
    }

    async function handleCreate() {
        setLoading(true)
        try {
            await createProject(
                form.productName,
                form.productDescription,
                form.researchGoal,
                form.seedQuestions.filter((q) => q.trim()),
                form.participantEmails.filter((e) => e.trim())
            )
            router.refresh()
            closePanel()
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        if (!currentProjectId || !viewedProject) return
        setLoading(true)
        try {
            const canEditFields = viewedProject.sessions.every((s) => s.status === 'pending')
            const newEmails = form.participantEmails.filter((e) => e.trim())

            const { sessions } = await updateProject(currentProjectId, {
                ...(canEditFields
                    ? {
                          productDescription: form.productDescription,
                          researchGoal: form.researchGoal,
                          seedQuestions: form.seedQuestions,
                      }
                    : {}),
                ...(newEmails.length ? { participantEmails: newEmails } : {}),
            })
            setViewedProject((p) =>
                p
                    ? {
                          ...p,
                          ...(canEditFields
                              ? {
                                    productDescription: form.productDescription,
                                    researchGoal: form.researchGoal,
                                    seedQuestions: form.seedQuestions,
                                }
                              : {}),
                          sessions: [
                              ...p.sessions,
                              ...sessions.map((s) => ({
                                  id: s.id,
                                  participantEmail: s.participantEmail,
                                  status: 'pending' as SessionStatus,
                                  notionUrl: null,
                                  issuesUrl: null,
                                  notionStatus: null,
                                  issuesStatus: null,
                              })),
                          ],
                      }
                    : null
            )
            setViewEditMode(false)
            setForm(DEFAULT_FORM)
            router.refresh()
        } finally {
            setLoading(false)
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
                                onDeleteRequest={() => {
                                    setOpenMenuId(null)
                                    setDeleteConfirmId(project.id)
                                }}
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
                        {panelMode === 'view' && !viewEditMode && viewedProject && (
                            <button
                                onClick={startEditMode}
                                title={
                                    !viewedProject.sessions.every(s => s.status === 'pending')
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
                    {panelMode === 'view' && viewedProject && !viewEditMode ? (
                        <ViewPanel project={viewedProject} />
                    ) : panelMode === 'view' && viewedProject ? (
                        <ProjectFormBody
                            mode="edit"
                            form={form}
                            onChange={setForm}
                            existingSessions={viewedProject.sessions}
                            canEditFields={viewedProject.sessions.every(
                                (s) => s.status === 'pending'
                            )}
                            onSubmit={handleSave}
                            onCancel={cancelEdit}
                            loading={loading}
                        />
                    ) : (
                        <ProjectFormBody
                            mode="create"
                            form={form}
                            onChange={setForm}
                            onSubmit={handleCreate}
                            loading={loading}
                        />
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
    const issuesUrl = project.sessions.find((s) => s.issuesUrl)?.issuesUrl
    const issuesFailed = project.sessions.some((s) => s.issuesStatus === 'failed')

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
                    Seed questions
                </p>
                {project.seedQuestions.filter(Boolean).length > 0 ? (
                    project.seedQuestions.filter(Boolean).map((q, i) => (
                        <p key={i} className="text-[13px] text-ink">
                            {q}
                        </p>
                    ))
                ) : (
                    <p className="text-[13px] text-muted italic">None added</p>
                )}
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
                                <StatusBadge status={session.status} />
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
                                {session.notionUrl ? (
                                    <a
                                        href={session.notionUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[12px] text-primary hover:text-primary-hover transition-colors"
                                    >
                                        Brief ↗
                                    </a>
                                ) : session.notionStatus === 'failed' ? (
                                    <span className="text-[12px] text-red-400">Brief failed</span>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {(issuesUrl || issuesFailed) && (
                <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                        Issues
                    </p>
                    {issuesUrl ? (
                        <a
                            href={issuesUrl}
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
    form: FormFields
    onChange: (f: FormFields) => void
    existingSessions?: Session[]
    canEditFields?: boolean
    onSubmit: () => void
    onCancel?: () => void
    loading: boolean
}

function ProjectFormBody({
    mode,
    form,
    onChange,
    existingSessions = [],
    canEditFields = true,
    onSubmit,
    onCancel,
    loading,
}: ProjectFormBodyProps) {
    function isEmailDupe(email: string, index: number): boolean {
        if (!email.trim()) return false
        const normalized = email.trim().toLowerCase()
        return (
            existingSessions.some((s) => s.participantEmail.toLowerCase() === normalized) ||
            form.participantEmails.some(
                (other, j) => j !== index && other.trim().toLowerCase() === normalized
            )
        )
    }

    const hasDupe = form.participantEmails.some((e, i) => isEmailDupe(e, i))

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                onSubmit()
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
                        onChange={(e) => onChange({ ...form, productName: e.target.value })}
                        className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg focus:outline-none focus:border-primary transition-colors"
                        placeholder="e.g. Loom"
                    />
                ) : (
                    <p className="text-[13px] text-ink">{form.productName}</p>
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
                        onChange={(e) => onChange({ ...form, productDescription: e.target.value })}
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
                {canEditFields ? (
                    <textarea
                        required={mode === 'create'}
                        value={form.researchGoal}
                        onChange={(e) => onChange({ ...form, researchGoal: e.target.value })}
                        className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg resize-none focus:outline-none focus:border-primary transition-colors"
                        rows={2}
                        placeholder="e.g. Understand why users drop off during onboarding"
                    />
                ) : (
                    <p className="text-[13px] text-ink leading-relaxed">{form.researchGoal}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Seed questions</label>
                {mode === 'create' && (
                    <p className="text-[12px] text-muted -mt-1">
                        The AI will probe and follow up — these are starting points only.
                    </p>
                )}
                {canEditFields ? (
                    <>
                        {form.seedQuestions.map((q, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) => {
                                        const updated = [...form.seedQuestions]
                                        updated[i] = e.target.value
                                        onChange({ ...form, seedQuestions: updated })
                                    }}
                                    className="border border-neutral-200 rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg flex-1 focus:outline-none focus:border-primary transition-colors"
                                    placeholder={`Question ${i + 1}`}
                                />
                                {form.seedQuestions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange({
                                                ...form,
                                                seedQuestions: form.seedQuestions.filter(
                                                    (_, j) => j !== i
                                                ),
                                            })
                                        }
                                        aria-label="Remove"
                                        className="text-muted hover:text-ink transition-colors w-6 h-6 flex items-center justify-center shrink-0 outline-none"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.seedQuestions.length < 5 && (
                            <button
                                type="button"
                                onClick={() =>
                                    onChange({
                                        ...form,
                                        seedQuestions: [...form.seedQuestions, ''],
                                    })
                                }
                                className="text-[13px] text-primary hover:text-primary-hover transition-colors self-start outline-none"
                            >
                                + Add question
                            </button>
                        )}
                    </>
                ) : form.seedQuestions.filter(Boolean).length > 0 ? (
                    form.seedQuestions.filter(Boolean).map((q, i) => (
                        <p key={i} className="text-[13px] text-ink">
                            {q}
                        </p>
                    ))
                ) : (
                    <p className="text-[13px] text-muted italic">None added</p>
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
                {form.participantEmails.map((email, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    const updated = [...form.participantEmails]
                                    updated[i] = e.target.value
                                    onChange({ ...form, participantEmails: updated })
                                }}
                                className={`border rounded-[6px] px-3 py-2 text-sm text-ink placeholder:text-muted bg-bg flex-1 focus:outline-none transition-colors ${
                                    isEmailDupe(email, i)
                                        ? 'border-red-300 focus:border-red-400'
                                        : 'border-neutral-200 focus:border-primary'
                                }`}
                                placeholder="participant@email.com"
                            />
                            {form.participantEmails.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onChange({
                                            ...form,
                                            participantEmails: form.participantEmails.filter(
                                                (_, j) => j !== i
                                            ),
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
                    onClick={() =>
                        onChange({ ...form, participantEmails: [...form.participantEmails, ''] })
                    }
                    className="text-[13px] text-primary hover:text-primary-hover transition-colors self-start outline-none"
                >
                    + Add participant
                </button>
            </div>

            <div className="flex gap-2 mt-1">
                <button
                    type="submit"
                    disabled={loading || hasDupe}
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
        </form>
    )
}
