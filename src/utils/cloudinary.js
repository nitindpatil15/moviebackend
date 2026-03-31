import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
import { API_KEY, API_SECRETE, CLOUDINARY_NAME } from '../constant.js';
          
cloudinary.config({ 
  cloud_name: CLOUDINARY_NAME, 
  api_key: API_KEY, 
  api_secret: API_SECRETE
});


const uploadOnCloudinary = async (localfilepath)=>{
    try {
        if(!localfilepath) return null
        if (!fs.existsSync(localfilepath)) {
            throw new Error(`File not found: ${localfilepath}`);
        }
        const response = await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })
        // File has been Uploaded Successfully 
        if (fs.existsSync(localfilepath)) {
            fs.unlinkSync(localfilepath);
        }
         return response
    } catch (error) {
        console.error(error);
        if (fs.existsSync(localfilepath)) {
            fs.unlinkSync(localfilepath);
        }
        throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
      }
}


export {uploadOnCloudinary}