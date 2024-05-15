import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, channelCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvtar, updateUserCoverImage, getUserChannelProfile, getWatchedHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { varifyJWT } from  "../middlewares/auth.middleware.js"
import multer from "multer";

const router = Router()


router.route("/register").post(
    upload.fields([
        {
            name: "avtar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser) 



// secured routes

router.route("/logout").post(varifyJWT, logoutUser)
router.route("/refreshToken").post(refreshAccessToken)

//
router.route("/changedPassword").post(varifyJWT, channelCurrentPassword)

router.route("/currentUser").get(varifyJWT, getCurrentUser)

router.route("/updatedetails").patch(varifyJWT, updateAccountDetails)

router.route("/avtar").patch(varifyJWT, upload.single("avtar"), updateUserAvtar)

router.route("/cover-image").patch(varifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(varifyJWT, getUserChannelProfile)

router.route("/watchHistory").get(varifyJWT, getWatchedHistory)



export default router