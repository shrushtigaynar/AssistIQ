import * as workspaceService from '../services/workspaceService.js'

const handle = (operation) => async (req, res, next) => {
  try {
    const data = await operation(req)
    if (data === null) {
      return res.status(404).json({ success: false, message: 'Workspace record not found' })
    }
    return res.json({ success: true, data })
  } catch (error) {
    return next(error)
  }
}

export const getOverview = handle(() => workspaceService.getWorkspaceOverview())

export const getActionItems = handle((req) => workspaceService.listActionItems({
  status: req.query.status,
  priority: req.query.priority,
  search: req.query.search,
}))

export const updateActionItem = handle((req) => workspaceService.updateWorkspaceActionItem(
  req.params.threadId,
  req.params.actionId,
  req.body,
  req.user.name,
))

export const getFollowUps = handle((req) => workspaceService.listFollowUps(req.query.status || 'ALL'))

export const updateFollowUp = handle((req) => workspaceService.updateFollowUp(
  req.params.threadId,
  req.body,
  req.user.name,
))

export const getMeetings = handle((req) => workspaceService.listMeetings(req.query.status || 'ALL'))

export const updateMeeting = handle((req) => workspaceService.updateMeeting(
  req.params.threadId,
  req.body,
  req.user.name,
))

export const getSettings = handle((req) => workspaceService.getAssistantSettings(req.user.id, req.user.email))

export const updateProfile = handle((req) => workspaceService.updateProfile(req.user.id, req.body))
