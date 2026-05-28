import { Router } from "express"
import { getChannelStats, getChannelVideos, getTopVideos, getChannelAnalytics } from "../controllers/dashboard.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()

// ✅ Get channel statistics (requires authentication)
// URL: /api/v1/dashboard/stats
router.route("/stats").get(verifyJWT, getChannelStats)

// ✅ Get all videos uploaded by the channel (requires authentication)
// URL: /api/v1/dashboard/videos
router.route("/videos").get(verifyJWT, getChannelVideos)

// ✅ Get top videos (requires authentication)
// URL: /api/v1/dashboard/videos/top
router.route("/videos/top").get(verifyJWT, getTopVideos)

// ✅ Get channel analytics (requires authentication)
// URL: /api/v1/dashboard/channel/analytics
router.route("/channel/analytics").get(verifyJWT, getChannelAnalytics)

export default router
