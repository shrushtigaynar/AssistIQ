import React, { useState } from 'react'
import { KeyRound, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react'
import { createPortalSession } from '../services/api'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'

export const PortalSignIn = ({ role, initialError = '', onAuthenticated }) => {
  const [token, setToken] = useState('')
  const [error, setError] = useState(initialError)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isClient = role === 'CLIENT'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token.trim()) {
      setError('Enter your portal access token.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const session = await createPortalSession(token.trim())
      if (session?.role !== role) {
        throw new Error(`This token does not grant ${role.toLowerCase()} portal access.`)
      }
      onAuthenticated(token.trim(), session)
    } catch (requestError) {
      setError(requestError.message || 'Unable to verify portal access.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg border ${isClient ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-brand-500/30 bg-brand-500/10 text-brand-300'}`}>
            {isClient ? <UserRound className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </div>
          <CardTitle>{isClient ? 'Client Portal' : 'Assistant Portal'} sign in</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-400">
            Access is verified by the backend. Ask your administrator for the {isClient ? 'client' : 'assistant'} portal token configured on the server.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="portal-token" className="text-[11px] font-mono text-zinc-400">Portal access token</label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <KeyRound className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  id="portal-token"
                  type="password"
                  autoComplete="current-password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                  placeholder="Paste your access token"
                />
              </div>
              <Button type="submit" variant={isClient ? 'primary' : 'brand'} disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </div>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <p className="text-[10px] text-zinc-600">The token is stored only in this browser’s local storage and is sent only to the AssistIQ API.</p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
