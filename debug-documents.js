// Debug script to check documents in the project
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = "mongodb+srv://suryashaktidev:qG4aSsyfpAFSFD4B@social-media.ofhxyn7.mongodb.net/documentExtraction?retryWrites=true&w=majority&appName=social-media";

async function checkDocuments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    
    // Check documents collection
    const documents = await db.collection('documents').find({
      projectId: new mongoose.Types.ObjectId('687653a8395848229071d69a')
    }).toArray();

    console.log(`📊 Found ${documents.length} documents in project:`);
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc._id}`);
      console.log(`   Filename: ${doc.filename}`);
      console.log(`   Original Name: ${doc.originalName}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Extracted Data Keys: ${Object.keys(doc.extractedData || {})}`);
      console.log('---');
    });

    // Also check document collections (if you're using the collection system)
    const collections = await db.collection('documentcollections').find({
      projectId: new mongoose.Types.ObjectId('687653a8395848229071d69a')
    }).toArray();

    console.log(`📁 Found ${collections.length} document collections in project:`);
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ID: ${collection._id}`);
      console.log(`   Name: ${collection.name}`);
      console.log(`   Original Name: ${collection.originalName}`);
      console.log(`   Document Count: ${collection.documentCount}`);
      console.log(`   Extracted Data Keys: ${Object.keys(collection.extractedData || {})}`);
      console.log('---');
    });

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDocuments();
