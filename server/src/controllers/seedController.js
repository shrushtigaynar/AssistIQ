import * as threadService from '../services/threadService.js'

export const resetSeed = async (req, res, next) => {
  try {
    const data = await threadService.resetDatabase()
    const counts = await threadService.getCounts()
    res.json({
      success: true,
      message: 'Database reset to default 12 executive threads',
      data,
      counts,
    })
  } catch (err) {
    next(err)
  }
}
