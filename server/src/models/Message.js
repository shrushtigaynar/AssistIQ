import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      index: true,
    },
    sender: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      avatar: { type: String, default: '' },
      company: { type: String, default: '' },
      isVIP: { type: Boolean, default: false },
      isMe: { type: Boolean, default: false },
    },
    recipients: [{ type: String }],
    cc: [{ type: String }],
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    dateStr: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Message = mongoose.model('Message', messageSchema)
