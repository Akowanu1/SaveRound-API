const mongoose = require('mongoose');

// Default local database for development.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ajo_api';

// Reuse the existing connection if it is already open.
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Connect once and fail fast if Mongo is unavailable.
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  return mongoose.connection;
}

module.exports = {
  connectDB,
  mongoose,
};
