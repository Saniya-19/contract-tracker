import { randomBytes } from 'crypto';
import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param {Buffer} buffer - Raw file bytes from multer memoryStorage
 * @param {Object} options
 * @param {string} options.folder - Cloudinary folder path (e.g. "contract-tracker/<contractId>/<milestoneId>")
 * @param {string} options.originalName - Original file name (stored as context metadata)
 * @returns {Promise<{ url: string, publicId: string, resourceType: string }>}
 */
export const uploadBuffer = (buffer, { folder, originalName }) => {
  return new Promise((resolve, reject) => {
    // Generate a random, unguessable public_id so URLs cannot be enumerated
    const publicId = `${Date.now()}_${randomBytes(12).toString('hex')}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder,
        public_id: publicId,
        context: { original_name: originalName },
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new ApiError(502, `File upload failed: ${error?.message || 'Unknown Cloudinary error'}`)
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 * Ignores "not found" errors (resource may have been deleted already).
 *
 * @param {string} publicId - Cloudinary public_id of the asset
 * @param {string} [resourceType='auto'] - Cloudinary resource_type
 */
export const deleteFile = async (publicId, resourceType = 'auto') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    // "not found" (http_code 404) is safe to ignore
    if (err?.http_code !== 404) {
      throw new ApiError(502, `Failed to delete file from storage: ${err?.message}`);
    }
  }
};

export default { uploadBuffer, deleteFile };
