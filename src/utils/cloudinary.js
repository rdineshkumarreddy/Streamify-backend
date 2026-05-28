import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"

dotenv.config()

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    
    // Check if it's a URL
    const isUrl = localFilePath.startsWith('http');
    
    let response;
    if (!isUrl) {
      response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
        timeout: 600000, // 10 minutes timeout
      });
    } else {
      // It's a URL
      response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
        timeout: 600000,
      });
    }
    
    console.log("File uploaded on cloudinary. Full response: ", JSON.stringify(response));
    console.log("File uploaded on cloudinary. File src: " + (response?.url || response?.secure_url));
    
    // Only delete from server if it's a local file
    if (!isUrl && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    return response;
  } catch (error) {
    console.log("Error on cloudinary", error);
    
    // Only try to delete if it's a local file path
    if (localFilePath && !localFilePath.startsWith('http') && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deleteFromCloudinary = async (public_Id) => {
  try {
    const response = await cloudinary.uploader.destroy(public_Id);
    console.log("File deleted from cloudinary:", response);
    return response;
  } catch (error) {
    console.log("Error deleting from cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
