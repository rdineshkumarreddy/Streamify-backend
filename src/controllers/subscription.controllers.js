import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log("toggleSubscription -> channelId:", channelId);
  console.log("toggleSubscription -> user:", req.user?._id);

  // TODO: toggle subscription
  if (!isValidObjectId(channelId)) {
    console.log("Invalid channel ID provided:", channelId);
    throw new ApiError(400, "Invalid channel ID");
  }
  // if (req.user?._id.toString() === channelId) {
  //   console.log("User tried to subscribe to self:", req.user?._id);
  //   throw new ApiError(400, "You cannot subscribe to yourself");
  // }
  const existingSub = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });
  
  if (existingSub) {
    console.log("Found existing subscription, deleting:", existingSub._id);
    await Subscription.findByIdAndDelete(existingSub._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  } else {
    // Otherwise, create a new subscription
    console.log("Creating new subscription...");
    const subscription = await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });

    // Create notification for channel owner
    try {
        await Notification.create({
            recipient: channelId,
            sender: req.user?._id,
            type: "subscription",
            content: `${req.user?.username} subscribed to your channel`
        });
    } catch (notifErr) {
        console.error("Failed to create subscription notification:", notifErr);
        // Continue execution, don't fail the subscription
    }
    
    console.log("Subscription created:", subscription._id);
    return res
      .status(201)
      .json(new ApiResponse(201, subscription, "Subscribed successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }
  
  const subscribers = await Subscription.find({
    channel: channelId,
  }).populate("subscriber", "username fullname avatar");
  
  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber Id");
  }
  
  const channels = await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "username fullname avatar");
  
  return res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
});

const checkSubscriptionStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isSubscribed: !!subscription }, "Subscription status fetched"));
});

export { 
    toggleSubscription, 
    getUserChannelSubscribers, 
    getSubscribedChannels,
    checkSubscriptionStatus
};
