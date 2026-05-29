import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mailer.js";
import mongoose from "mongoose";

const RegisterUser = asyncHandler(async (req, res) => {
  let avatar, coverImage;
  try {
    const { fullname, email, username, password } = req.body;

    // Validation
    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required.");
    }

    const existedUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existedUser) {
      throw new ApiError(409, "User already exists with email or username");
    }

    // File paths
    const AvatarLocalPath = req.files?.avatar?.[0]?.path;
    const CoverLocalPath = req.files?.coverImage?.[0]?.path;

    if (!AvatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing");
    }

    // Upload to cloudinary
    avatar = await uploadOnCloudinary(AvatarLocalPath);
    if (CoverLocalPath) {
      coverImage = await uploadOnCloudinary(CoverLocalPath);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 3600000); // 1 hour

    const hasSMTP = process.env.SMTP_USER && process.env.SMTP_PASS;

    // Save user
    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
      verifyOtp: otp,
      verifyOtpExpiry: otpExpiry,
      isVerified: hasSMTP ? false : true,
    });

    // Send email if SMTP is configured (non-blocking)
    if (hasSMTP) {
      sendEmail({
        email,
        subject: "Verify your email",
        message: `<h1>Welcome to Streamify</h1><p>Your OTP is: <strong>${otp}</strong></p>`,
      }).catch((emailError) => {
        console.error("Failed to send verification email:", emailError);
      });
    }

    // Fetch created user without password/refreshToken
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken -verifyOtp -verifyOtpExpiry"
    );

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          {
            user: createdUser,
            otp: otp
          },
          "User registered successfully. Please verify your email with the OTP sent."
        )
      );
  } catch (error) {
    console.error("User creation failed:", error.message);

    // cleanup uploaded files
    if (avatar) await deleteFromCloudinary(avatar.public_id);
    if (coverImage) await deleteFromCloudinary(coverImage.public_id);

    throw new ApiError(
      500,
      error?.message || "Something went wrong while registering the user"
    );
  }
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  const { email, username, password } = req.body;

  //validation
  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }

  // Convert username to lowercase to match database storage
  const user = await User.findOne({
    $or: [{ email }, { username: username?.toLowerCase() }],
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // Check if user is verified
  if (!user.isVerified) {
    throw new ApiError(403, "Please verify your email first");
  }

  //validate password

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect");
  }
  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user details"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname) {
    throw new ApiError(400, "Fullname is required");
  }
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfuly"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const AvatarLocalPath = req.file?.path;

  if (!AvatarLocalPath) {
    throw new ApiError(400, "File is required");
  }
  const avatar = await uploadOnCloudinary(AvatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImagePath = req.file?.path;
  if (!coverImagePath) {
    throw new ApiError(400, "File is required");
  }
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!coverImage) {
    throw new ApiError(400, "Something went wrong while");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Access token required");
  }
  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incommingRefreshToken != user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }
    const options = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while refreshing the access token"
    );
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "User name is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel", // users who subscribed to this channel
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber", // channels this user subscribed to
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $addFields: {
        // Reverse history to get most recent first
        reversedHistory: { $reverseArray: "$watchHistory" },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "reversedHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      // Re-sort the watchHistory array because $lookup doesn't guarantee order matching localField array
      // Also filter out any nulls in case the video was deleted
      $addFields: {
        watchHistory: {
          $filter: {
            input: {
              $map: {
                input: "$reversedHistory",
                as: "id",
                in: {
                  $first: {
                    $filter: {
                      input: "$watchHistory",
                      cond: { $eq: ["$$this._id", "$$id"] },
                    },
                  },
                },
              },
            },
            as: "item",
            cond: { $ne: ["$$item", null] },
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory || [],
        "Watch history fetched successfully"
      )
    );
});

const clearWatchHistory = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { watchHistory: [] },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Watch history cleared successfully"));
});

// const RegisterUser = asyncHandler(async (req, res) => {
//   const { fullname, email, username, password } = req.body;

//    Validation
//   if ([fullname, username, email, password].some((field) => field?.trim() === "")) {
//     throw new ApiError(400, "All fields are required.");
//   }

//   // Check if user already exists
//   const existedUser = await User.findOne({ $or: [{ email }, { username }] });
//   if (existedUser) {
//     throw new ApiError(409, "User already exists with email or username");
//   }

//   console.warn(req.files);

//   const AvatarLocalPath = req.files?.avatar?.[0]?.path;
//   const CoverLocalPath = req.files?.coverImage?.[0]?.path;

//   if (!AvatarLocalPath) {
//     throw new ApiError(400, "Avatar file is missing");
//   }

//   const avatar = await uploadOnCloudinary(AvatarLocalPath);
//   let coverImage = "";
//   if (CoverLocalPath) {
//     coverImage = await uploadOnCloudinary(CoverLocalPath);
//   }

//   const user = await User.create({
//     fullname,
//     avatar: avatar.url,
//     coverImage: coverImage?.url || "",
//     email,
//     password,
//     username: username.toLowerCase(),
//   });

//   const createdUser = await User.findById(user._id).select("-password -refreshToken");

//   if (!createdUser) {
//     throw new ApiError(500, "Something went wrong while registering the user");
//   }

//   return res
//     .status(201)
//     .json(new ApiResponse(200, createdUser, "User registered successfully"));
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await User.findOne({
    email,
    verifyOtp: otp,
    verifyOtpExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.isVerified = true;
  user.verifyOtp = undefined;
  user.verifyOtpExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Email verified successfully. You can now login."
      )
    );
});

const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const user = await User.findOne({ username: username.toLowerCase() });

  if (user) {
    return res
      .status(200)
      .json(new ApiResponse(200, { available: false }, "Username is taken"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { available: true }, "Username is available"));
});

const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { available: false },
          "Email is already registered"
        )
      );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { available: true }, "Email is available"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 600000); // 10 minutes

  user.forgotPasswordOtp = otp;
  user.forgotPasswordOtpExpiry = otpExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email,
      subject: "Reset your password",
      message: `<h1>Password Reset Request</h1>
                <p>Your OTP to reset your password is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 10 minutes.</p>`,
    });
  } catch (error) {
    user.forgotPasswordOtp = undefined;
    user.forgotPasswordOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send reset email");
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset OTP sent to email")
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP, and new password are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    forgotPasswordOtp: otp,
    forgotPasswordOtpExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.password = newPassword;
  user.forgotPasswordOtp = undefined;
  user.forgotPasswordOtpExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {}, "Password has been reset successfully")
  );
});

export {
  verifyEmail,
  checkUsername,
  checkEmail,
  RegisterUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserCoverImage,
  updateUserAvatar,
  refreshAccessToken,
  getUserChannelProfile,
  getWatchHistory,
  clearWatchHistory,
  forgotPassword,
  resetPassword,
};
