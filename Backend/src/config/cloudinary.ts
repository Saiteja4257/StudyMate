import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  filename: string
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    // Preserve extension and sanitize special characters so the URL opens directly as a PDF
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "studymate_docs",
        resource_type: "raw", // 'raw' supports full PDF documents
        public_id: `${Date.now()}-${sanitizedFilename}`,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
};
