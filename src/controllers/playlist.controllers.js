import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  if (!name?.trim()) {
    throw new ApiError(400, "Playlist name is required");
  }
  if (!description?.trim()) {
    throw new ApiError(400, "Description is required");
  }
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id, // logged-in user as owner
    videos: [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user?._id;
  
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }
  
  const playlists = await Playlist.find({ owner: userId });

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist ID");

  const playlist = await Playlist.findById(playlistId).populate("videos");

  if (!playlist) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  
  // Use .some() or .toString() for reliable ObjectId comparison
  if (!playlist.videos.some(id => id.toString() === videoId)) {
    playlist.videos.push(videoId);
    await playlist.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");
  
  playlist.videos = playlist.videos.filter((v) => v.toString() !== videoId);
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  const playlist = await Playlist.findByIdAndDelete(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );
  if (!playlist) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

const getWatchLaterPlaylist = asyncHandler(async (req, res) => {
  let playlist = await Playlist.findOne({
    name: "Watch Later",
    owner: req.user._id,
  }).populate("videos");

  if (!playlist) {
    playlist = await Playlist.create({
      name: "Watch Later",
      description: "Videos to watch later",
      owner: req.user._id,
      videos: [],
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Watch Later playlist fetched successfully"));
});

const toggleWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  let playlist = await Playlist.findOne({
    name: "Watch Later",
    owner: req.user._id,
  });

  if (!playlist) {
    playlist = await Playlist.create({
      name: "Watch Later",
      description: "Videos to watch later",
      owner: req.user._id,
      videos: [videoId],
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { added: true }, "Added to Watch Later"));
  }

  const alreadyAdded = playlist.videos.some(id => id.toString() === videoId);
  
  if (!alreadyAdded) {
    playlist.videos.push(videoId);
    await playlist.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { added: true }, "Added to Watch Later"));
  } else {
    playlist.videos = playlist.videos.filter(id => id.toString() !== videoId);
    await playlist.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { added: false }, "Removed from Watch Later"));
  }
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  getWatchLaterPlaylist,
  toggleWatchLater,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
