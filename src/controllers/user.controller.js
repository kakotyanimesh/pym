import { asyncHandelers } from "../utils/asyncHandelers.js"
import {ApiError} from "../utils/apierrors.js"
import {User} from "../model/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiresponse.js"
import jwt from "jsonwebtoken"


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


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}