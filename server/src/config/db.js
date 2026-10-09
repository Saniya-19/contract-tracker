import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Establishes connection to MongoDB database via Mongoose.
 */
export const connectDB = async () => {
  try {
    console.log('Mongo URI loaded:', env.MONGO_URI?.startsWith('mongodb+srv://'));
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failure: ${error.message}`);
    process.exit(1);
  }
};
