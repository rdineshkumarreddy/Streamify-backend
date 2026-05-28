import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["like", "comment", "subscription", "tweet", "video"],
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        content: {
            type: String
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = mongoose.model("Notification", notificationSchema);
