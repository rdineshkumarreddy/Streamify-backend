import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const connectioninstance = await mongoose.connect(`${process.env.MONGODB_URI.replace(/\/$/, "")}/${DB_NAME}`)
        console.log(` \n MongoDB Connected! DB host ${connectioninstance.connection.host}`)
    } catch (error) {
        console.log("MongoDB Connection error",error)
        process.exit(1)
    }
}

export default connectDB