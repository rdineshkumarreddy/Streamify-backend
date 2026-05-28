import { Router } from "express"
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getWatchLaterPlaylist,
    toggleWatchLater
} from "../controllers/playlist.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

// ✅ Get Watch Later playlist (Specific route before general :playlistId)
router.route("/watch-later").get(verifyJWT, getWatchLaterPlaylist)
router.route("/watch-later/toggle/:videoId").post(verifyJWT, toggleWatchLater)

// ✅ Create a new playlist & get current user's playlists
// POST /api/v1/playlists
// GET /api/v1/playlists
router.route("/").post(verifyJWT, createPlaylist).get(verifyJWT, getUserPlaylists)

// ✅ Get all playlists of a user
// GET /api/v1/playlists/user/:userId
router.route("/user/:userId").get(verifyJWT, getUserPlaylists)

// ✅ Get playlist by ID
// GET /api/v1/playlists/:playlistId
router.route("/:playlistId").get(verifyJWT, getPlaylistById)

// ✅ Add a video to playlist
// POST /api/v1/playlists/:playlistId/video/:videoId
router.route("/:playlistId/video/:videoId").post(verifyJWT, addVideoToPlaylist)

// ✅ Remove a video from playlist
// DELETE /api/v1/playlists/:playlistId/video/:videoId
router.route("/:playlistId/video/:videoId").delete(verifyJWT, removeVideoFromPlaylist)

// ✅ Delete a playlist
// DELETE /api/v1/playlists/:playlistId
router.route("/:playlistId").delete(verifyJWT, deletePlaylist)

// ✅ Update playlist details
// PATCH /api/v1/playlists/:playlistId
router.route("/:playlistId").patch(verifyJWT, updatePlaylist)

export default router
