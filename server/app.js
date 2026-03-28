import "./config/env.js";

// import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { startServer } from "./server.js";

// dotenv.config();

const port = process.env.PORT || 8000;

async function startApp() {
  try {
    // Connect DB first
    await connectDB();
    await startServer(port);
  } catch (err) {
    console.error("Failed to start application:", err);
    process.exit(1);
  }
}

startApp();
