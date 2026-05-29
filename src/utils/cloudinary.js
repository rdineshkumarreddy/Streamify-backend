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
      const stats = fs.existsSync(localFilePath) ? fs.statSync(localFilePath) : null;
      const ext = localFilePath.split('.').pop()?.toLowerCase() || '';
      const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
      
      if (isVideo && stats && stats.size > 10 * 1024 * 1024) {
        console.log(`Using Cloudinary upload_large chunked upload for ${localFilePath} (size: ${stats.size} bytes)...`);
        response = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            localFilePath,
            {
              resource_type: "video",
              chunk_size: 6000000, // 6MB chunk size
              timeout: 600000,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
        });
      } else {
        response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: isVideo ? "video" : "auto",
          timeout: 600000, // 10 minutes timeout
        });
      }
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
    console.error("Error on cloudinary upload:", error);
    
    // Only try to delete if it's a local file path
    if (localFilePath && !isUrl && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.error("Failed to delete local file:", err);
      }
    }
    throw error;
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
