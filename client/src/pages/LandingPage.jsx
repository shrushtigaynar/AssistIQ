import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Inbox,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  HelpCircle,
  Archive,
  Link2,
  Bot,
  Focus,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const categories = [
  { icon: ShieldCheck, label: 'Assistant to Reply', tone: 'text-indigo-600 bg-indigo-50 border-indigo-100', note: 'Scheduling, routine requests, follow-ups' },
  { icon: UserCheck, label: 'Client to Reply', tone: 'text-amber-600 bg-amber-50 border-amber-100', note: 'Decisions, approvals, personal matters' },
  { icon: Archive, label: 'No Reply Needed', tone: 'text-zinc-500 bg-zinc-50 border-zinc-200', note: 'Newsletters, receipts, notifications' },
  { icon: HelpCircle, label: 'Needs Review', tone: 'text-rose-600 bg-rose-50 border-rose-100', note: 'Ambiguous emails you assign manually' },
]

const steps = [
  {
    icon: Link2,
    title: 'Connect your email account',
    text: 'Sign in and securely connect your Gmail account. AssistIQ only requests the permissions it needs.',
  },
  {
    icon: Bot,
    title: 'AI analyzes and categorizes',
    text: 'Every incoming email is analyzed and assigned to exactly one of the four responsibility categories.',
  },
  {
    icon: Focus,
    title: 'Focus on what matters',
    text: 'See the emails that actually need your attention, with AI-suggested replies you approve before anything is sent.',
  },
]

const features = [
  {
    icon: Sparkles,
    title: 'AI-powered classification',
    text: 'Every email is sorted by who should respond: you, your assistant, or nobody at all.',
  },
  {
    icon: Send,
    title: 'Smart reply suggestions',
    text: 'AssistIQ drafts professional replies you can edit. Drafts stay drafts until you approve them.',
  },
  {
    icon: ShieldCheck,
    title: 'Responsibility separation',
    text: 'A clear boundary between emails you must answer and those an assistant can handle for you.',
  },
  {
    icon: MailCheck,
    title: 'Human-controlled responses',
    text: 'No email is ever sent without your explicit approval. You stay in control of every reply.',
  },
]

const InboxPreview = () => (
  <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-elevated">
    <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
      <span className="ml-3 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
        <Inbox className="h-3.5 w-3.5" /> assistiq.app/inbox
      </span>
    </div>
    <div className="flex">
      <div className="hidden w-40 shrink-0 border-r border-zinc-200 p-2 sm:block">
        {categories.map((category) => (
          <div key={category.label} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left">
            <category.icon className={`h-3.5 w-3.5 ${category.tone.split(' ')[0]}`} />
            <span className="truncate text-[11px] font-medium text-zinc-700">{category.label}</span>
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 divide-y divide-zinc-100">
        {[
          { sender: 'Alice · Law Firm', subject: 'Contract approval needed', tag: 'Client to Reply', variant: 'client' },
          { sender: 'Bob · Partner Co', subject: 'Schedule a call next week', tag: 'Assistant to Reply', variant: 'assistant' },
          { sender: 'Acme News', subject: 'Your weekly digest', tag: 'No Reply Needed', variant: 'noReply' },
          { sender: 'Unknown sender', subject: 'Re: matter', tag: 'Needs Review', variant: 'needsReview' },
        ].map((row, index) => (
          <div key={row.subject} className={`flex items-center gap-3 px-3.5 py-2.5 ${index === 0 ? 'bg-brand-50/40' : ''}`}>
            <span className="initials flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500">
              {row.sender.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold text-zinc-800">{row.sender}</span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">9:{10 + index * 4} AM</span>
              </div>
              <span className="block truncate text-[11px] text-zinc-600">{row.subject}</span>
            </div>
            <Badge variant={row.variant} size="sm" className="shrink-0">{row.tag}</Badge>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const LandingPage = () => (
  <div className="min-h-screen bg-white text-zinc-900">
    {/* Navbar */}
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="AssistIQ home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600">
            <Mail className="h-4 w-4 text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">AssistIQ</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
          <a href="#how-it-works" className="hover:text-zinc-900">How It Works</a>
          <a href="#features" className="hover:text-zinc-900">Features</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/signin">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button variant="brand" size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
          Your Inbox,<br />Intelligently Managed.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-zinc-600">
          AssistIQ organizes your emails by understanding who needs to respond — you, your assistant, or nobody at all.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/signup">
            <Button variant="brand" size="lg">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="secondary" size="lg">How It Works</Button>
          </a>
        </div>
        <p className="text-xs text-zinc-500">Replies are only sent with your explicit approval.</p>
      </div>
      <div className="flex justify-center md:justify-end">
        <InboxPreview />
      </div>
    </section>

    {/* How It Works */}
    <section id="how-it-works" className="border-t border-zinc-200/70 bg-zinc-50/60">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How It Works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <step.icon className="h-4.5 w-4.5 h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-zinc-400">STEP {index + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section id="features">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Features</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-brand-600">
                <feature.icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="border-t border-zinc-200/70 bg-zinc-50/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-14 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Start with a cleaner inbox today.</h2>
        <Link to="/signup">
          <Button variant="brand" size="lg">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-zinc-200/70">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600">
            <Mail className="h-3 w-3 text-white" />
          </span>
          <span className="font-medium text-zinc-700">AssistIQ</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Privacy</span>
          <span>Contact</span>
        </div>
        <span>© {new Date().getFullYear()} AssistIQ. All rights reserved.</span>
      </div>
    </footer>
  </div>
)

export default LandingPage
