import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { LiveStream } from "../models/livestream.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import { Video } from "../models/video.models.js";
import crypto from "crypto";

// Create a new live stream
const createLiveStream = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;

  if (!title?.trim()) {
    throw new ApiError(400, "Stream title is required");
  }

  // Check if user already has an active stream
  const existingStream = await LiveStream.findOne({
    streamer: req.user._id,
    isLive: true,
  });

  if (existingStream) {
    throw new ApiError(400, "You already have an active stream. Please end it before starting a new one.");
  }

  // Generate unique stream key
  const streamKey = crypto.randomBytes(16).toString("hex");

  const liveStream = await LiveStream.create({
    title,
    description: description || "",
    streamer: req.user._id,
    streamKey,
    category: category || "General",
  });

  const populatedStream = await LiveStream.findById(liveStream._id).populate(
    "streamer",
    "username avatar fullname"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedStream, "Live stream created successfully"));
});

// Get all active live streams
const getActiveLiveStreams = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const streams = await LiveStream.find({ isLive: true })
    .populate("streamer", "username avatar fullname")
    .sort({ viewerCount: -1, startedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await LiveStream.countDocuments({ isLive: true });

  return res.status(200).json(
    new ApiResponse(200, {
      streams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    }, "Active streams fetched successfully")
  );
});

// Get a specific live stream
const getLiveStream = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  const stream = await LiveStream.findById(streamId).populate(
    "streamer",
    "username avatar fullname email"
  );

  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, stream, "Stream fetched successfully"));
});

// Update viewer count
const updateViewerCount = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { action } = req.body; // 'join' or 'leave'

  const stream = await LiveStream.findById(streamId);

  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  if (action === 'join') {
    stream.viewerCount += 1;
    if (stream.viewerCount > stream.peakViewerCount) {
      stream.peakViewerCount = stream.viewerCount;
    }
  } else if (action === 'leave') {
    stream.viewerCount = Math.max(0, stream.viewerCount - 1);
  }

  await stream.save();

  return res
    .status(200)
    .json(new ApiResponse(200, stream, "Viewer count updated"));
});

// End live stream
const endLiveStream = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  const stream = await LiveStream.findById(streamId);

  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  if (stream.streamer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to end this stream");
  }

  if (!stream.isLive) {
    throw new ApiError(400, "Stream is already ended");
  }

  stream.isLive = false;
  stream.endedAt = new Date();
  await stream.save();

  // Save the ended stream as a Video post
  const durationInSeconds = Math.max(1, Math.floor((stream.endedAt - stream.startedAt) / 1000));
  
  const validCategories = ["All", "Music", "Gaming", "News", "Movies", "Educational", "Live"];
  const finalCategory = validCategories.includes(stream.category) ? stream.category : "Live";

  await Video.create({
    title: stream.title,
    description: stream.description || "Live stream recording",
    videoFile: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Dummy video since actual recording isn't implemented
    thumbnail: `https://loremflickr.com/1280/720/${encodeURIComponent(stream.category || 'live')}`,
    duration: durationInSeconds,
    owner: stream.streamer,
    category: finalCategory,
    isPublished: true,
    views: stream.peakViewerCount || 0
  });

  return res
    .status(200)
    .json(new ApiResponse(200, stream, "Stream ended and published successfully"));
});

// Get user's stream history
const getStreamHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const streams = await LiveStream.find({ streamer: req.user._id })
    .sort({ startedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await LiveStream.countDocuments({ streamer: req.user._id });

  return res.status(200).json(
    new ApiResponse(200, {
      streams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    }, "Stream history fetched successfully")
  );
});

// Send chat message
const sendChatMessage = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { message } = req.body;

  if (!message?.trim()) {
    throw new ApiError(400, "Message is required");
  }

  const stream = await LiveStream.findById(streamId);

  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  if (!stream.isLive) {
    throw new ApiError(400, "Cannot send messages to ended streams");
  }

  if (!stream.chatEnabled) {
    throw new ApiError(400, "Chat is disabled for this stream");
  }

  const chatMessage = await ChatMessage.create({
    stream: streamId,
    user: req.user._id,
    message: message.trim(),
  });

  const populatedMessage = await ChatMessage.findById(chatMessage._id).populate(
    "user",
    "username avatar"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});

// Get chat messages
const getChatMessages = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { limit = 50 } = req.query;

  const messages = await ChatMessage.find({
    stream: streamId,
    isDeleted: false,
  })
    .populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .limit(limit * 1);

  return res
    .status(200)
    .json(new ApiResponse(200, messages.reverse(), "Messages fetched successfully"));
});

// Like a stream
const likeStream = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  const stream = await LiveStream.findById(streamId);

  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  stream.likes += 1;
  await stream.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { likes: stream.likes }, "Stream liked"));
});

export {
  createLiveStream,
  getActiveLiveStreams,
  getLiveStream,
  updateViewerCount,
  endLiveStream,
  getStreamHistory,
  sendChatMessage,
  getChatMessages,
  likeStream,
};
