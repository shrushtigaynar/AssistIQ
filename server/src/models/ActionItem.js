import mongoose from 'mongoose'

const actionItemSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    task: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: String,
      enum: ['assistant', 'client'],
      default: 'assistant',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    deadline: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

export const ActionItem = mongoose.model('ActionItem', actionItemSchema)
