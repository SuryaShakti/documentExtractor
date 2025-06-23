import mongoose from 'mongoose';

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function connectDB(): Promise<void> {
  if (connection.isConnected) {
    console.log('Already connected to MongoDB');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI!, {
      // Updated connection options for newer MongoDB driver
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Removed deprecated options:
      // bufferCommands: false,
      // bufferMaxEntries: 0,
    });

    connection.isConnected = db.connections[0].readyState;

    console.log(`MongoDB Connected: ${db.connection.host}`);
    
    // Set up connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      connection.isConnected = 0;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      connection.isConnected = mongoose.connection.readyState;
    });

  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Database connection failed');
  }
}

export default connectDB;
