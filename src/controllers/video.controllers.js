import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId, category } = req.query;
  
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);

  let filter = {};
  
  // If query is provided, search by title
  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }
  
  // If userId is provided, filter by user
  if (userId && isValidObjectId(userId)) {
    filter.owner = userId;
  }

  // If category is provided and not "All", filter by category
  if (category && category !== "All") {
    filter.category = category;
  }
  
  // IMPORTANT: For home page (no userId), typically we only want published videos
  // But for now let's just show all videos or maybe just published ones if we had that flag
  // Let's assume we show everything for now to match user expectation of seeing uploads
  
  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sort["createdAt"] = -1;
  }

  const videos = await Video.find(filter)
    .populate("owner", "username fullname avatar")
    .sort(sort)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  const totalVideos = await Video.countDocuments(filter);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200, {
          videos,
          totalVideos,
          page: pageNumber,
          limit: pageSize
        },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, thumbnailUrl, category } = req.body;
  
  // Validate required fields
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  
  // Get file paths from multer
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  // Validate video file
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  if (!videoFile?.url) {
    throw new ApiError(500, "Video upload failed. Please try again.");
  }

  // Handle thumbnail (file upload has priority over AI URL)
  let thumbnailResult = "";
  
  if (thumbnailLocalPath) {
    console.log("Processing local thumbnail upload...");
    const uploadedthumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    thumbnailResult = uploadedthumbnail?.secure_url || uploadedthumbnail?.url || "";
  } else if (thumbnailUrl) {
    console.log("Processing AI thumbnail URL:", thumbnailUrl);
    const uploadedthumbnail = await uploadOnCloudinary(thumbnailUrl);
    // If cloudinary fails for the URL, use the original URL as fallback
    thumbnailResult = uploadedthumbnail?.secure_url || uploadedthumbnail?.url || thumbnailUrl;
  }

  console.log("Final thumbnail URL decided:", thumbnailResult);

  // Create video in database
  const video = await Video.create({
    title,
    description,
    category: category || "All",
    videoFile: videoFile.url,
    thumbnail: thumbnailResult, 
    duration: videoFile.duration || 0,
    owner: req.user._id,
  });

  // Notify all subscribers
  try {
    const subscribers = await Subscription.find({ channel: req.user._id });
    if (subscribers.length > 0) {
      const notifications = subscribers.map(sub => ({
        recipient: sub.subscriber,
        sender: req.user._id,
        type: "video",
        video: video._id,
        content: `uploaded a new video: ${video.title}`,
      }));
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error("Failed to notify subscribers:", err);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  // In many implementations, view count is incremented here.
  // However, to avoid double counting from React re-renders or metadata-only fetches,
  // we've moved this to a separate endpoint called when the video is actually watched.

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId)
      }
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
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers"
            }
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false
                }
              }
            }
          },
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        owner: { $first: "$owner" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        category: 1
      }
    }
  ]);

  if (!video?.length) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, category } = req.body;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const updateData = {};
  if (title) {
    updateData.title = title;
  }
  if (description) {
    updateData.description = description;
  }
  if (category) {
    updateData.category = category;
  }
  if (req.file?.path) {
    const thumbnail = await uploadOnCloudinary(req.file.path);
    updateData.thumbnail = thumbnail?.url || "";
  }
  const updatedVideo = await Video.findByIdAndUpdate(videoId, updateData, {
    new: true,
  });

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully")); //
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Extract public_id from Cloudinary URLs and delete them
  // A typical Cloudinary URL: http://res.cloudinary.com/cloud_name/resource_type/type/v1/public_id.ext
  const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('.')[0];
  };

  const videoPublicId = extractPublicId(video.videoFile);
  const thumbnailPublicId = extractPublicId(video.thumbnail);

  if (videoPublicId) {
    // Note: for videos, you might need to pass resource_type: 'video' to destroy method depending on cloudinary config, 
    // but the utility only accepts public_id. We'll use the existing utility.
    await deleteFromCloudinary(videoPublicId);
  }
  
  if (thumbnailPublicId) {
    await deleteFromCloudinary(thumbnailPublicId);
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully from DB and Cloudinary"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video not found");
  video.isPublished = !video.isPublished;

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video publish status updated"));
});

const updateVideoViews = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // If user is logged in, manage their watch history
  if (req.user) {
    const user = await User.findById(req.user._id);
    
    // Check if video is already in history to avoid duplicate increments
    const hasWatched = user.watchHistory.includes(videoId);

    // Update watch history: Remove if exists and push to end (most recent)
    // This allows the history page to show the most recently watched videos at the top
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { watchHistory: videoId }
      }
    );
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: { watchHistory: videoId }
      }
    );

    if (hasWatched) {
      // User has already watched this video, skip view increment but history is updated
      return res
        .status(200)
        .json(new ApiResponse(200, { views: video.views, alreadyWatched: true }, "Watch history updated"));
    }
  }

  // Increment views in database (for guests or first-time watch for logged-in users)
  video.views += 1;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { views: video.views }, "Video views incremented"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  updateVideoViews,
};
