import React from 'react'
import { Link } from 'react-router-dom'
import { Icons } from './Icons'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    description?: string
    breadcrumbs?: BreadcrumbItem[]
    actions?: React.ReactNode
    meta?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, meta, className = '' }: PageHeaderProps) {
    return (
        <div className={`mb-6 border-b border-slate-200/70 pb-5 animate-in slide-in-from-top-2 fade-in duration-500 ${className}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center space-x-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 overflow-x-auto whitespace-nowrap no-scrollbar">
                        {breadcrumbs.map((item, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <Icons.ChevronRight className="w-3 h-3 mx-1 text-slate-400" />}
                                {item.href ? (
                                    <Link to={item.href} className="hover:text-indigo-600 transition-colors">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className="text-slate-900 font-medium">{item.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    {title}
                </h1>
                {description && (
                    <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                        {description}
                    </p>
                )}
                {meta && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 sm:text-sm">
                        {meta}
                    </div>
                )}
            </div>
            {actions && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end shrink-0">
                    {actions}
                </div>
            )}
            </div>
        </div>
    )
}
