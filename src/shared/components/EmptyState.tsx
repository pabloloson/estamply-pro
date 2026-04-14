'use client'

import Link from 'next/link'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const button = (
    <button onClick={onAction} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white sm:w-auto w-full" style={{ background: '#6C5CE7' }}>
      {actionLabel}
    </button>
  )

  const link = actionHref ? (
    <Link href={actionHref} className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-white sm:w-auto w-full text-center" style={{ background: '#6C5CE7' }}>
      {actionLabel}
    </Link>
  ) : null

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 max-w-sm mx-auto text-center">
      <span className="text-5xl mb-4 opacity-60">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>
      {actionHref ? link : button}
    </div>
  )
}
