import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import {Video} from "../models/video.models.js"
import {Notification} from "../models/notification.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comments = await Comment.aggregatePaginate(commentsAggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })
    
    // Populate owner details for immediate UI update
    await comment.populate("owner", "username fullname avatar");

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    // Create notification for video owner
    if (video.owner.toString() !== req.user?._id.toString()) {
        await Notification.create({
            recipient: video.owner,
            sender: req.user?._id,
            type: "comment",
            video: videoId,
            comment: comment._id,
            content: `${req.user?.username} commented on your video: ${video.title}`
        });
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment")
    }

    comment.content = content
    await comment.save()
    
    await comment.populate("owner", "username fullname avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}