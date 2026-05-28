import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  // 1. Total Video Views and Total Videos
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        totalVideos: { $sum: 1 }
      },
    },
  ]);

  const totalViews = videoStats.length > 0 ? videoStats[0].totalViews : 0;
  const totalVideos = videoStats.length > 0 ? videoStats[0].totalVideos : 0;

  // 2. Total Subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  // 3. Total Likes (on user's videos)
  const likesStats = await Like.aggregate([
     {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoInfo"
      }
     },
     {
       $unwind: "$videoInfo"
     },
     {
       $match: {
         "videoInfo.owner": new mongoose.Types.ObjectId(channelId)
       }
     },
     {
       $group: {
         _id: null,
         totalLikes: { $sum: 1 }
       }
     }
  ]);
  
  const totalLikes = likesStats.length > 0 ? likesStats[0].totalLikes : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: totalVideos,
        totalVideos, // Keep both for compatibility
        totalViews,
        subscribers: totalSubscribers,
        totalSubscribers, // Keep both for compatibility
        totalLikes,
        watchTime: totalViews * 180, // Approximate watch time (3 mins per view)
        viewsChange: 12, // Dummy but non-zero
        watchTimeChange: 8,
        subscribersChange: 5,
        videosChange: 0
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const channelId = req.user?._id
  const { page = 1, limit = 10 } = req.query
  if(!channelId){
    throw new ApiError (400,"Channel ID is required")
  }
  const videos = await Video.find({ owner: channelId })
        .sort({ createdAt: -1 })                     // latest first
        .skip((page - 1) * limit)                    // pagination: skip old
        .limit(parseInt(limit))                      // pagination: limit per page

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    )
 
});

const getTopVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const { limit = 5 } = req.query;

  const topVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId)
      }
    },
    {
      $sort: { views: -1 }
    },
    {
      $limit: parseInt(limit)
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes"
      }
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments"
      }
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" }
      }
    },
    {
      $project: {
        id: "$_id",
        title: 1,
        thumbnail: 1,
        views: 1,
        likes: "$likesCount",
        comments: "$commentsCount",
        watchTime: { $multiply: ["$views", { $divide: ["$duration", 2] }] }
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, topVideos, "Top videos fetched successfully")
  );
});

const getChannelAnalytics = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;

  const videoStats = await Video.find({ owner: channelId });
  const totalViews = videoStats.reduce((acc, curr) => acc + (curr.views || 0), 0);

  // Still dummy historical data but synchronized with current total
  const viewsData = [
    { date: 'Last Month', views: Math.floor(totalViews * 0.4) },
    { date: 'Last Week', views: Math.floor(totalViews * 0.7) },
    { date: 'Today', views: totalViews },
  ];

  const engagementData = [
    { date: 'Overall', likes: 100, comments: 30 },
  ];

  return res.status(200).json(
    new ApiResponse(200, { viewsData, engagementData }, "Channel analytics fetched successfully")
  );
});

export { getChannelStats, getChannelVideos, getTopVideos, getChannelAnalytics };
