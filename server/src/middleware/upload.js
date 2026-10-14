import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

/**
 * Allowed MIME types and their corresponding file extensions.
 * Both checks must pass for a file to be accepted.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.webp',
  '.zip', '.doc', '.docx', '.txt', '.md',
]);

/**
 * Multer file filter – validates mimetype AND extension.
 * Rejects files that fail either check with ApiError(400).
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new ApiError(400, 'File type not allowed'), false);
  }

  cb(null, true);
};

/**
 * Multer instance:
 * - memoryStorage (buffer passed to Cloudinary upload stream)
 * - single field named "file"
 * - 10 MB size limit
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

export default upload;
