import { Router } from "express";
// Express Router → lets us create route handlers in modular files

import { 
    toggleSubscription, 
    getUserChannelSubscribers, 
    getSubscribedChannels,
    checkSubscriptionStatus
} from "../controllers/subscription.controllers.js";
// Importing our subscription controller functions

import { verifyJWT } from "../middlewares/auth.middlewares.js";
// Middleware to protect routes (ensures user is logged in)

const router = Router();

//------------------------------------------
// Toggle subscription to a channel
// Route: POST /api/v1/subscriptions/toggle/:channelId
//------------------------------------------
router.route("/toggle/:channelId").post(verifyJWT, toggleSubscription);

//------------------------------------------
// Get all subscribers of a channel
// Route: GET /api/v1/subscriptions/channel/:channelId
//------------------------------------------
router.route("/channel/:channelId").get(verifyJWT, getUserChannelSubscribers);

//------------------------------------------
// Get all channels that a user is subscribed to
// Route: GET /api/v1/subscriptions/user/:subscriberId
//------------------------------------------
router.route("/user/:subscriberId").get(verifyJWT, getSubscribedChannels);

router.route("/c/:channelId").get(verifyJWT, checkSubscriptionStatus);

export default router;
