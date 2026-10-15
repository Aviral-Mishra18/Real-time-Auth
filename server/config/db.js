const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncspace';

  try {
    // Attempt connecting to configured or default local MongoDB instance with short timeout
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB at: ${conn.connection.host}`);
    return;
  } catch (err) {
    console.warn(`[Database] Standalone MongoDB connection failed (${err.message}). Initializing embedded MongoDB server...`);
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const memoryUri = mongoServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to embedded MongoDB Memory Server at: ${conn.connection.host}`);
  } catch (memErr) {
    console.error(`[Database] Fatal: Failed to initialize embedded MongoDB`, memErr);
    process.exit(1);
  }
};

const closeDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connectDB, closeDB };
