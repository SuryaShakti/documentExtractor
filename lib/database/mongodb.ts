import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMongoURI(): string {
  const uris = [
    process.env.MONGODB_URI,
    process.env.MONGODB_URI_ALT1,
    process.env.MONGODB_URI_ALT2,
    process.env.MONGODB_URI_ALT3,
    process.env.NODE_ENV === "development"
      ? process.env.MONGODB_URI_LOCAL
      : null,
  ].filter(Boolean) as string[];

  if (uris.length === 0) {
    throw new Error("❌ No MongoDB URI found in environment variables");
  }

  return uris[0]; // ✅ Use only the first valid URI
}

async function attemptConnection(
  uri: string,
  attempt = 1
): Promise<typeof mongoose> {
  try {
    console.log(`Attempting MongoDB connection (attempt ${attempt})...`);

    const db = await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      bufferCommands: false,
    });

    console.log(`✅ MongoDB Connected: ${db.connection.host}`);
    return db;
  } catch (error: any) {
    console.error(`Connection attempt ${attempt} failed: ${error.message}`);

    if (attempt < MAX_RETRIES) {
      console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await wait(RETRY_DELAY);
      return attemptConnection(uri, attempt + 1);
    }

    throw new Error(`❌ Final connection attempt failed: ${error.message}`);
  }
}

async function connectDB(): Promise<void> {
  if (connection.isConnected === 1) {
    console.log("✅ Already connected to MongoDB");
    return;
  }

  const uri = getMongoURI();

  try {
    const db = await attemptConnection(uri);
    connection.isConnected = db.connections[0].readyState;

    // Set up safe connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      connection.isConnected = 0;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
      connection.isConnected = 0;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔁 MongoDB reconnected");
      connection.isConnected = mongoose.connection.readyState;
    });

    console.log("✅ Database connection established successfully");
  } catch (err: any) {
    console.error("\n❌ All MongoDB connection attempts failed");
    console.error("🔍 Troubleshooting Tips:");
    console.error("1. Check if your IP is whitelisted in MongoDB Atlas");
    console.error("2. Verify credentials and URI");
    console.error("3. Make sure the cluster is running and not paused");
    console.error("4. Try connecting via MongoDB Compass");
    throw err;
  }
}

// Connection status checker
export function isConnected(): boolean {
  return connection.isConnected === 1;
}

// Safe disconnect
export async function disconnectDB(): Promise<void> {
  if (connection.isConnected === 1) {
    await mongoose.disconnect();
    connection.isConnected = 0;
    console.log("✅ MongoDB disconnected");
  }
}

export default connectDB;
