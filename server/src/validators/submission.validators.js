import { z } from 'zod';

/**
 * Allowed URL schemes for link submissions.
 * Only http and https are accepted; javascript: and data: are explicitly rejected.
 */
const ALLOWED_LINK_SCHEMES = ['http:', 'https:'];

const safeUrl = z
  .string()
  .trim()
  .max(500, 'Link URL cannot exceed 500 characters')
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return ALLOWED_LINK_SCHEMES.includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Link URL must be a valid http or https URL' }
  );

/**
 * Zod schema for the submission body (multipart/form-data text fields).
 * The actual file is handled by multer; this validates the non-file fields.
 *
 * Rule: exactly one of (file via multer) OR linkUrl must be provided.
 * That cross-field check is enforced in the controller since multer must
 * run first to populate req.file.
 */
export const addSubmissionSchema = z.object({
  linkUrl: safeUrl.optional(),
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional(),
});

export default { addSubmissionSchema };
