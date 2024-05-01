import { asyncHandelers } from "../utils/asyncHandelers.js"


const registerUser = asyncHandelers( async (req, res) => {
    res.status(200).json({
        message: "fixed the bug baby"
    })
})

export {registerUser}