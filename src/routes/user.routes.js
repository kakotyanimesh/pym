import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { varifyJWT } from  "../middlewares/auth.middleware.js"

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

export default router