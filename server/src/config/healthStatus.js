export const getHealthStatus = (mongoConnected, mongoRequired) => {
  const database = mongoConnected
    ? 'MONGODB_LIVE'
    : mongoRequired
      ? 'MONGODB_REQUIRED_UNAVAILABLE'
      : 'LOCAL_PERSISTENT_STORE'
  const unavailable = mongoRequired && !mongoConnected

  return {
    httpStatus: unavailable ? 503 : 200,
    status: unavailable ? 'DEGRADED' : 'OK',
    database,
  }
}
