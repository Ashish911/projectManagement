import mongoose from "mongoose";

/**
 * This function connects to the MongoDB database using the provided URI.
 * The URI is expected to be stored in the `MONGO_URI` environment variable.
 *
 * @return {Promise<void>} A promise that resolves when the connection is established.
 * @throws {Error} If there is an error connecting to the database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
    );
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

export default connectDB;
