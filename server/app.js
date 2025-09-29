// import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { server } from "./server.js";

// dotenv.config();

const port = process.env.PORT || 8000;

async function startApp() {
    try {
        // Connect DB first
        await connectDB();

        // Create express app
        const app = server();

        // Start server
        app.listen(port, () => {
            console.log(`Server started on port ${port}`);
        });
    } catch (err) {
        console.error("Failed to start application:", err);
        process.exit(1);
    }
}

startApp()