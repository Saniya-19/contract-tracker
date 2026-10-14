import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: [true, 'Contract reference is required'],
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: [true, 'Milestone reference is required'],
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitter reference is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['file', 'link'],
        message: 'Type must be one of: file, link',
      },
      required: [true, 'Submission type is required'],
    },

    // ── File-specific fields ────────────────────────────────────────
    fileUrl: { type: String },
    publicId: { type: String },        // Cloudinary public_id (needed for deletion)
    resourceType: { type: String },    // Cloudinary resource_type (image/raw/video)
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },

    // ── Link-specific fields ────────────────────────────────────────
    linkUrl: { type: String },

    // ── Common fields ───────────────────────────────────────────────
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    revisionRound: {
      type: Number,
      required: [true, 'Revision round is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Clean JSON and Object output representations
submissionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

submissionSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
