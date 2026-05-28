import { Router } from "express";


import {RegisterUser,loginUser,logoutUser,refreshAccessToken,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getCurrentUser,getUserChannelProfile,getWatchHistory,clearWatchHistory,changeCurrentPassword, verifyEmail, checkUsername, checkEmail, forgotPassword, resetPassword} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

//Unsecured routes
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  RegisterUser
);

router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/verify-otp").post(verifyEmail);
router.route("/check-username").get(checkUsername);
router.route("/check-email").get(checkEmail);
router.route("/refresh-token").post(refreshAccessToken);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/history").get(verifyJWT, getWatchHistory).delete(verifyJWT, clearWatchHistory);

export default router;
