import mongoose from "mongoose";
import { DB_name } from "../constants.js"


const dbConnect = async () => {
    try {
        const connected = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`)
        console.log(`mongodb connected successfully to the host : ${connected.connection.host}`);

    } catch (error) {
        console.log(`mongodb connection fails`, error);
        process.exit(1)
    }
}

export default dbConnect