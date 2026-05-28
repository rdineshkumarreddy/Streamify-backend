import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new Schema(
  {
    stream: {
      type: Schema.Types.ObjectId,
      ref: "LiveStream",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
chatMessageSchema.index({ stream: 1, createdAt: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
