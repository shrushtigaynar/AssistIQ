import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-brand-400 shrink-0" />,
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-zinc-700/80 bg-zinc-900/95 px-3.5 py-2.5 text-xs text-zinc-100 shadow-elevated backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      {icons[type] || icons.info}
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-zinc-400 hover:text-zinc-200 rounded p-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
