import mongoose from "mongoose";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.aggregate([
        {
            $match: {
                recipient: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "sender",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                sender: { $first: "$sender" },
                video: { $first: "$video" }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden");
    }

    notification.isRead = true;
    await notification.save();

    return res
        .status(200)
        .json(new ApiResponse(200, notification, "Notification marked as read"));
});

const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "All notifications marked as read"));
});

export {
    getNotifications,
    markAsRead,
    markAllAsRead
};
