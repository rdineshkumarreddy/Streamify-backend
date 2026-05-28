import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  getTweetFeed,
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// ✅ Create a new tweet
router.route("/").post(verifyJWT, createTweet);

// ✅ Get tweet feed (subscriptions + self)
router.route("/feed").get(verifyJWT, getTweetFeed);

// ✅ Get all tweets of a user
router.route("/user/:userId").get(verifyJWT, getUserTweets);

// ✅ Update a tweet
router.route("/:tweetId").patch(verifyJWT, updateTweet);

// ✅ Delete a tweet
router.route("/:tweetId").delete(verifyJWT, deleteTweet);

export default router;
