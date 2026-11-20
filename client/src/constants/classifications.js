export const CLASSIFICATIONS = {
  ASSISTANT_REPLY: {
    value: 'ASSISTANT_REPLY',
    label: 'Assistant to Reply',
    short: 'Assistant',
    description: 'Emails an assistant can handle: scheduling, routine requests, and follow-ups.',
    badgeVariant: 'assistant',
    dot: 'bg-indigo-500',
    bar: 'bg-indigo-500',
  },
  CLIENT_REPLY: {
    value: 'CLIENT_REPLY',
    label: 'Client to Reply',
    short: 'You',
    description: 'Emails that need your personal decision, approval, or response.',
    badgeVariant: 'client',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  NO_REPLY_NEEDED: {
    value: 'NO_REPLY_NEEDED',
    label: 'No Reply Needed',
    short: 'No reply',
    description: 'Newsletters, receipts, and notifications. Always kept accessible.',
    badgeVariant: 'noReply',
    dot: 'bg-zinc-400',
    bar: 'bg-zinc-400',
  },
  NEEDS_REVIEW: {
    value: 'NEEDS_REVIEW',
    label: 'Needs Review',
    short: 'Review',
    description: 'Ambiguous or low-confidence emails you should assign manually.',
    badgeVariant: 'needsReview',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
}

export const CATEGORY_KEYS = ['ALL', 'ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']

export const classificationConfig = (value) =>
  CLASSIFICATIONS[value] || CLASSIFICATIONS.NEEDS_REVIEW

export const formatDateTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const formatFullDateTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}
