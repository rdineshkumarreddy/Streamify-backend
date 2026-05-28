import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: false
    }
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetSchema);
