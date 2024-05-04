import { asyncHandelers } from "../utils/asyncHandelers.js"
import {ApiError} from "../utils/apierrors.js"
import {User} from "../model/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiresponse.js"
import {upload} from "../middlewares/multer.middlewares.js"

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
   } else {
    
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

export {registerUser}