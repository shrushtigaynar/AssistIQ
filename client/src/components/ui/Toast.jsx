import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export const Toast = ({ message, type = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />,
    info: <Info className="h-4 w-4 text-brand-600 shrink-0" />,
  }

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-800 shadow-elevated"
    >
      {icons[type] || icons.info}
      <span className="font-medium max-w-xs">{message}</span>
      <button onClick={onClose} className="ml-1 text-zinc-400 hover:text-zinc-700 rounded p-0.5" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
