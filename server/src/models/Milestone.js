import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: [true, 'Contract reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    amount: {
      type: Number,
      required: [true, 'Milestone amount is required'],
      min: [1, 'Milestone amount must be at least 1'],
      set: (val) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    order: {
      type: Number,
      required: [true, 'Milestone order is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'paid'],
        message: 'Status must be one of: pending, in_progress, submitted, revision_requested, approved, paid',
      },
      default: 'pending',
      index: true,
    },
    revisionNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Revision notes cannot exceed 1000 characters'],
      default: null,
    },
    submissionNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Submission note cannot exceed 1000 characters'],
      default: null,
    },
    startedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: [100, 'Payment reference cannot exceed 100 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring order is unique per contract
milestoneSchema.index({ contract: 1, order: 1 }, { unique: true });

// Clean JSON and Object output representations
milestoneSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

milestoneSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;
