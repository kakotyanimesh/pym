import dotenv from "dotenv"
import dbConnect from "./db/dbindex.js"
import { app } from "./app.js"

dotenv.config({
    path: "./.env"
})

dbConnect()
.then(() =>{
    app.listen(process.env.PORT || 3000, () => {
        console.log(`mongodb connected to port ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log(`mongodb connection fails !!!`, err);
})