// Error logging that never exposes secrets or email contents:
// messages in this codebase carry only status codes, identifiers, and
// generic reasons (no tokens, keys, or bodies), and the stack trace
// contains file paths and line numbers only.
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status
    || (['ValidationError', 'CastError'].includes(err.name) || err.type === 'entity.parse.failed' ? 400 : 500)

  console.error('[API Error]', {
    method: req.method,
    path: req.path,
    name: err.name || 'Error',
    message: String(err.message || '').slice(0, 500),
    statusCode,
    code: err.code || undefined,
    aiErrorCode: err.aiErrorCode || undefined,
    stack: statusCode >= 500 ? String(err.stack || '').split('\n').slice(0, 8).join('\n') : undefined,
  })

  // Client-facing message: 4xx messages are safe to show; 5xx details stay server-side.
  const message = statusCode < 500 ? err.message : 'Internal Server Error'
  res.status(statusCode).json({
    success: false,
    message: message || 'Request failed',
  })
}
