import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Contract title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer is required'],
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid client email address'],
      index: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [1, 'Total amount must be at least 1'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'pending', 'active', 'completed', 'rejected', 'cancelled'],
        message: 'Status must be one of: draft, pending, active, completed, rejected, cancelled',
      },
      default: 'draft',
      index: true,
    },
    sentAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Validate that endDate is strictly after startDate if both are present
contractSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Auto-link client if user exists with matching email and role "client" on creation
contractSchema.pre('save', async function (next) {
  if (this.isNew && !this.client && this.clientEmail) {
    const clientUser = await mongoose.model('User').findOne({
      email: this.clientEmail.toLowerCase(),
      role: 'client',
    });
    if (clientUser) {
      this.client = clientUser._id;
    }
  }
  next();
});

// Clean JSON and Object output representations
contractSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

contractSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Contract = mongoose.model('Contract', contractSchema);
export default Contract;
