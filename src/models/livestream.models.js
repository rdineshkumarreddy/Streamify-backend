import mongoose, { Schema } from "mongoose";

const liveStreamSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    streamer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isLive: {
      type: Boolean,
      default: true,
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    peakViewerCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    thumbnail: {
      type: String, // URL to thumbnail
    },
    streamKey: {
      type: String,
      required: true,
      unique: true,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      default: "General",
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active streams
liveStreamSchema.index({ isLive: 1, startedAt: -1 });
liveStreamSchema.index({ streamer: 1, isLive: 1 });

export const LiveStream = mongoose.model("LiveStream", liveStreamSchema);
