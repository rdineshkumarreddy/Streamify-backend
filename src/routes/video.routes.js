import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  updateVideoViews,
} from "../controllers/video.controllers.js";
import { verifyJWT, verifyOptionalJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

// Public routes
router.route("/").get(verifyOptionalJWT, getAllVideos);
router.get("/:videoId", verifyOptionalJWT, getVideoById);
router.route("/views/:videoId").patch(verifyOptionalJWT, updateVideoViews);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below

router.route("/publishAVideo").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

router.delete("/:videoId", deleteVideo);
router.patch("/:videoId", upload.single("thumbnail"), updateVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
