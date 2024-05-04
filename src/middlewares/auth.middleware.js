import { ApiError } from "../utils/apierrors";
import { asyncHandelers } from "../utils/asyncHandelers";
import jwt from "jsonwebtoken"
import { User } from "../model/user.model.js";


export const varifyJWT = asyncHandelers(async (req, _, next) => {
// if res isnot used -> use underscore _
    try {
        const  token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) {
            throw new ApiError(401, "unauthorized request")
        }
    
        // decode jwt
        const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user) {
            // todo discuss about frontend
            throw new ApiError(401, "invalid access token")
        }
    
        req.user = user;
        next()
    
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token")

    }
})