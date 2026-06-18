'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { FolderOpen, Plug, BarChart2, Menu } from 'lucide-react'
import { AppLogo } from './AppLogo'

interface Props {
    header: React.ReactNode
    children: React.ReactNode
}

export default function App({ header, children }: Props) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-bg overflow-hidden">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
                    w-[220px] shrink-0 border-r border-neutral-100 flex flex-col bg-surface
                    transition-transform duration-200 ease-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="px-5 h-14 flex items-center border-b border-neutral-100">
                    <div className="mt-1">
                        <AppLogo size={30} />
                    </div>
                    <span className="text-[13px] font-semibold text-ink tracking-tight">
                        VoiceScope
                    </span>
                </div>

                <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
                    <Link
                        href="/"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors outline-none ${
                            pathname === '/'
                                ? 'bg-neutral-100 text-ink'
                                : 'text-muted hover:text-ink hover:bg-neutral-50'
                        }`}
                    >
                        <FolderOpen size={15} className="shrink-0" />
                        Projects
                    </Link>

                    <Link
                        href="/settings/integrations"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors outline-none ${
                            pathname === '/settings/integrations'
                                ? 'bg-neutral-100 text-ink'
                                : 'text-muted hover:text-ink hover:bg-neutral-50'
                        }`}
                    >
                        <Plug size={15} className="shrink-0" />
                        Integrations
                    </Link>
                    <Link
                        href="/settings/usage"
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors outline-none ${
                            pathname === '/settings/usage'
                                ? 'bg-neutral-100 text-ink'
                                : 'text-muted hover:text-ink hover:bg-neutral-50'
                        }`}
                    >
                        <BarChart2 size={15} className="shrink-0" />
                        Usage
                    </Link>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="h-14 px-4 lg:px-8 flex items-center gap-3 border-b border-neutral-100 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-muted hover:text-ink transition-colors p-1 -ml-1 outline-none"
                        aria-label="Open menu"
                    >
                        <Menu size={18} />
                    </button>

                    {header}

                    <UserButton />
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">{children}</div>
            </div>
        </div>
    )
}
