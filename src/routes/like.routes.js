import { Router } from "express"
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
} from "../controllers/like.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

// ✅ Toggle like on a video
// URL: /api/v1/likes/video/:videoId
router.route("/video/:videoId").post(verifyJWT, toggleVideoLike)

// ✅ Toggle like on a comment
// URL: /api/v1/likes/comment/:commentId
router.route("/comment/:commentId").post(verifyJWT, toggleCommentLike)

// ✅ Toggle like on a tweet
// URL: /api/v1/likes/tweet/:tweetId
router.route("/tweet/:tweetId").post(verifyJWT, toggleTweetLike)

// ✅ Get all liked videos of logged-in user
// URL: /api/v1/likes/videos
router.route("/videos").get(verifyJWT, getLikedVideos)

export default router
