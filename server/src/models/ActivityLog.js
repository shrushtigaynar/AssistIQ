import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
      default: 'Elena Rostova (PA)',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
