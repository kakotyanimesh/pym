
import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../model/tweet.model.js"
import { User } from "../model/user.model.js"
import { ApiError } from "../utils/apierrors.js"
import { ApiResponse } from "../utils/apiresponse.js"
import { asyncHandelers } from "../utils/asyncHandelers.js"


const createTweet = asyncHandelers(async (req, res) => {
    const {content} = req.body
    if(!content){
        throw new ApiError(400, "you didnot provide anything to upload")
    }
    
    const user = await User.findById(req.body?._id)

    if (!user) {
        throw new ApiError(400, "user not found")
        
    }

    const tweet = await Tweet.create({
        content: content,
        owner: user._id
    })

    if (!tweet) {
        throw new ApiError(400, "something went wrong")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "tweet is succesfully tweetted")
    )
})

const getUserTweets = asyncHandelers(async (req, res) => {
    // TODO: get user tweets
})

const updateTweet = asyncHandelers(async (req, res) => {
    const {newContent} = req.body

    if(!newContent){
        throw new ApiError(400, "updated tweet is required")
    }

    const tweet = await Tweet.Up

})

const deleteTweet = asyncHandelers(async (req, res) => {
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}