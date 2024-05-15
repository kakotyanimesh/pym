import { asyncHandelers } from "../utils/asyncHandelers.js"
import {ApiError} from "../utils/apierrors.js"
import {User} from "../model/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiresponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


// access and refresh token
const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user =  await User.findById(userId)
        const accessToken = user.accessTokenGeneration()
        const refreshToken = user.refreshTokenGeneration()

        // refresh token in database 
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "something went wrong in the server while generating access and refresh token")
    }
}


const registerUser = asyncHandelers( async (req, res) => {
    //get user details from frontend
   // validation - not empty
   //check if user already exists - username/email
   //check for images and avtar
   // upload them to cloudinary, avtar
   // create userObject- create  entry in db
   // remove password and refresh token field from response
   // check user creation 
   // return res


   const {username, password, email, fullName} = req.body
//    console.log("email :", email);


   // validation

   if(
    [username, email, password, fullName].some((field) => field?.trim() ===  "")
   ){
     throw new ApiError(400, "field is required")
   }

   // userCheck
   const existedUser = await User.findOne({
    $or: [{username}, {email}]
 })

 if (existedUser) {
    throw new ApiError(409, "user with email or username already exists")

 }

 console.log(req.files);


   // image and avtar cheked

   const avtarLocalPath = req.files?.avtar[0]?.path
//    const coverImageLocalPath = req.files?.coverImage[0]?.path

   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
   } 
   
   // files not file => first error
   if(!avtarLocalPath){
    throw new ApiError(400, "avtar-local file required")
   }

// upload on clodinary

const avtar = await uploadOnCloudinary(avtarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if(!avtar){
    throw new ApiError(400, "avtar file is required")
}

// mongodb user object created

const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avtar: avtar.url,
    coverImage: coverImage?.url || ""

})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if (!createdUser) {
    throw new ApiError(500, "user isnot created")
}

return res.status(201).json(
    new ApiResponse(200, createdUser, "user created successfully")
)

})

const loginUser = asyncHandelers(async (req, res) => {
    // req.body -> data
    // username or email cheak
    // find the user
    // password check
    // access and refresh token
    // send cookie
    // res successfully login

    // data 
    const {email, username, password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
        // if we need only one then the below code 
    // if ((username || email)) {
    //     throw new ApiError(400, " username or email is required")
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user not found")
    }

    const isPasswordValid =  await user.isPasswordCorrect(password)
    
    if(!isPasswordValid){
        throw new ApiError(401, "invalid user credentials")

    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookie send 
    const options = {
        httpOnly: true,       // info send through only http server
        secure: true          // for security 
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken" , refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in succesfully"
        )
    )


})

const logoutUser = asyncHandelers(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // mongo operator use
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out "))
})


const refreshAccessToken = asyncHandelers(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
      const user = await User.findById(decodedToken._id)
  
      if(!user) {
          throw new ApiError(401, "invalid refresh token")
  
      }
  
  
      if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, " refresh token is expired or used")
  
      }
  
      const options = {
          httpOnly: true,
          secure: true
      }
  
      const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
          new ApiResponse(
              200,
              {
                  accessToken, newrefreshToken
              },
              "accesstoken refreshed successfully"
          )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token")

  }
})


const channelCurrentPassword = asyncHandelers(async(req, res)=> {
    const {oldPassword, newPassword, confirmPassword} = req.body 

    if(!(newPassword === confirmPassword) ) {
        throw new ApiError(400, "password didnot matched")
    }
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")

    }
    user.password = newPassword
    await user.save({validateBeforeSave: false}) 
    // saving password

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"))



})


const getCurrentUser = asyncHandelers(async (req, res)=>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandelers(async(req, res)=> {
    const {fullName, email } = req.body

    if(!fullName || !email){
        throw new ApiError(400, "all fields are required")

    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated successfully"))




})

const updateUserAvtar = asyncHandelers(async(req, res)=> {

    const avtarLocalPath= req.file?.path
    if (!avtarLocalPath) {
        throw new ApiError(400, "avtar file is missing")

    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)

    if(!avtar.url){
        throw new ApiError(400, "error while uploding on avtar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avtar: avtar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avtar file updated succesfully" ))


})

const updateUserCoverImage = asyncHandelers(async(req, res) => {
    const coverImageLocalFilePath = req.file?.path
    if(!coverImageLocalFilePath){
        throw new ApiError(400, "coverimage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalFilePath)

    if(!coverImage.url){
        throw new ApiError(400, "error while uplodaing on cloudinary")

    
    }

    const user = await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image successfully"))
})


const getUserChannelProfile = asyncHandelers(async (req, res)=>{
    const {username} = req.params

    if(!username?.trim){
        throw new ApiError(400, "username is missing")

    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            } 
            // for the count of how many subscriber the channel has
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subsribedTo"
            }
            // for how many channels the owner or user is subscribed to

        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                chennelesSubscribedToCount: {
                    $size: "$subsribedTo"
                },
                isSubcribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false


                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                chennelesSubscribedToCount: 1,
                isSubcribed: 1,
                avtar: 1,
                coverImage: 1,
                email: 1


            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel doesnot exits")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )

})


const getWatchedHistory = asyncHandelers(async(req, res)=> {
    // on req.user._id => we get a string value of the mongodbId but beacude of using mongoose we are getting the whole id  

   const user = await  User.aggregate([
    {
        $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)

        }
    },
    {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
                {
                    $lookup: {
                        from: "users",
                        localField:"owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avtar: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        owner: {
                            $first: "$owner"
                        }
                    }
                }
            ]
        }
    }
   ])

   return res
   .status(200)
   .json(
        new ApiResponse(200, 
            user[0].watchHistory,
            "watch history fetched successfully"
        )
   )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    channelCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvtar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchedHistory
}