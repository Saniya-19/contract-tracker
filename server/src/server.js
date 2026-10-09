import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

/**
 * Boots the server by connecting to MongoDB first, then starting the Express HTTP server listener.
 */
const startServer = async () => {
  // Connect to database before listening
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Gracefully handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Promise Rejection: ${err.message}`);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
