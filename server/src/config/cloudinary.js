import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

/**
 * Indicates whether Cloudinary is fully configured.
 * File upload endpoints check this before attempting any upload.
 */
export let cloudinaryConfigured = false;

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  cloudinaryConfigured = true;
} else {
  console.warn(
    '[cloudinary] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET not set. ' +
      'File uploads will return 503. Link submissions are unaffected.'
  );
}

export { cloudinary };
export default cloudinary;
