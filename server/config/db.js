import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Connects to MongoDB using the `MONGO_URI` environment variable.
 * Exits the process if the connection fails, since the app cannot run without a database.
 *
 * Indexes are declared in the schemas (`models/`). Outside production Mongoose builds them on
 * connect; in production `autoIndex` is off and `npm run db:indexes:prod` builds them at deploy
 * time, so API workers never run index builds on startup.
 * @returns {Promise<import("mongodb").Db>} The native database handle.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== "production",
    });
    logger.info({ host: conn.connection.host }, "MongoDB connected");
    return conn.connection.db;
  } catch (error) {
    // Log the failure and stop the app.
    logger.fatal({ err: error }, "MongoDB connection failed");
    process.exit(1);
  }
};

export default connectDB;
