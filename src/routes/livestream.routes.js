import { Router } from "express";
import {
  createLiveStream,
  getActiveLiveStreams,
  getLiveStream,
  updateViewerCount,
  endLiveStream,
  getStreamHistory,
  sendChatMessage,
  getChatMessages,
  likeStream,
} from "../controllers/livestream.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Public routes
router.route("/active").get(getActiveLiveStreams);
router.route("/:streamId").get(getLiveStream);
router.route("/:streamId/chat").get(getChatMessages);

// Protected routes
router.route("/create").post(verifyJWT, createLiveStream);
router.route("/:streamId/end").post(verifyJWT, endLiveStream);
router.route("/:streamId/viewers").patch(verifyJWT, updateViewerCount);
router.route("/history").get(verifyJWT, getStreamHistory);
router.route("/:streamId/chat").post(verifyJWT, sendChatMessage);
router.route("/:streamId/like").post(verifyJWT, likeStream);

export default router;
