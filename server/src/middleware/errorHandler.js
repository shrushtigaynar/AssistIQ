export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status
    || (['ValidationError', 'CastError'].includes(err.name) || err.type === 'entity.parse.failed' ? 400 : 500)
  const message = statusCode < 500 ? err.message : 'Internal Server Error'

  console.error('[API Error]', {
    name: err.name || 'Error',
    statusCode,
    code: err.code || undefined,
  })
  res.status(statusCode).json({
    success: false,
    message: message || 'Request failed',
  })
}
