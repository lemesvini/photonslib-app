import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_CONFIG = {
  endpoint: "https://ykfuxobrvxnwiynztiyp.storage.supabase.co/storage/v1/s3",
  region: "us-east-2", // Supabase default region
  credentials: {
    accessKeyId: "f20c54b0c913b3fda3d4af04827e2459",
    secretAccessKey:
      "31d20561a3d86bc6d86e886ec9cb37f95ac8875716073b1ce5eeca55362866ea",
  },
  forcePathStyle: true,
};

const s3Client = new S3Client(S3_CONFIG);

export const BUCKET_NAME = "photonslib";

/**
 * Upload an image file to Supabase S3 bucket
 * @param file The image file to upload
 * @param folder Optional folder path within the bucket (e.g., "images", "thumbnails")
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToS3(
  file: File,
  folder: string = "images"
): Promise<string> {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${timestamp}-${sanitizedFileName}`;

    // Convert File to ArrayBuffer for browser compatibility
    const arrayBuffer = await file.arrayBuffer();

    // Prepare the upload command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
      // Note: ACL is handled by Supabase bucket settings, not S3 ACL
    });

    // Upload the file
    const response = await s3Client.send(command);
    console.log("Upload successful:", response);

    // Construct the public URL using Supabase's public object URL format
    const publicUrl = `https://ykfuxobrvxnwiynztiyp.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;

    console.log("Generated public URL:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload image");
  }
}

/**
 * Upload multiple images to S3
 * @param files Array of image files to upload
 * @param folder Optional folder path within the bucket
 * @returns Array of public URLs of the uploaded images
 */
export async function uploadMultipleImagesToS3(
  files: File[],
  folder: string = "images"
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImageToS3(file, folder));
  return Promise.all(uploadPromises);
}
