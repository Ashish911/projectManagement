import mongoose from "mongoose";
import colors from "colors"; // Adds color helpers like `.cyan` to strings for console output

/**
 * Connects to MongoDB using the `MONGO_URI` environment variable.
 * Exits the process if the connection fails, since the app cannot run without a database.
 * @returns {Promise<import("mongodb").Db>} The native database handle, used to create indexes.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold,
    );
    return conn.connection.db;
  } catch (error) {
    // Log the failure and stop the app.
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

export default connectDB;
