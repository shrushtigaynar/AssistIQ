import mongoose from 'mongoose'

const internalNoteSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      index: true,
    },
    author: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, default: 'Just now' },
    authorRole: { type: String, default: 'ASSISTANT' },
  },
  { timestamps: true }
)

export const InternalNote = mongoose.model('InternalNote', internalNoteSchema)
