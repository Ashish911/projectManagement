// In-memory MongoDB for the e2e suite. Playwright starts it as the first `webServer`
// and waits for the port, then starts the API against it. Stops when Playwright kills it.
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.E2E_MONGO_PORT ?? 27018);
const mongo = await MongoMemoryServer.create({ instance: { port, ip: "127.0.0.1" } });
console.log(`E2E MongoDB ready at ${mongo.getUri()}`);

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
