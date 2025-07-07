// Debug script to check what URLs are stored for your documents
const { MongoClient } = require('mongodb');

async function checkDocumentUrls() {
  const uri = 'mongodb+srv://suryashaktidev:qG4aSsyfpAFSFD4B@social-media.ofhxyn7.mongodb.net/documentExtraction?retryWrites=true&w=majority&appName=social-media';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('documentExtraction');
    const documents = db.collection('documents');
    
    // Find the specific document
    const document = await documents.findOne({ _id: require('mongodb').ObjectId('686a925190f8e0993dfa7187') });
    
    if (document) {
      console.log('Document found:');
      console.log('Filename:', document.filename);
      console.log('Original Name:', document.originalName);
      console.log('Cloudinary URL:', document.cloudinary?.url);
      console.log('Cloudinary Secure URL:', document.cloudinary?.secureUrl);
      console.log('Cloudinary Public ID:', document.cloudinary?.publicId);
      console.log('File metadata:', document.fileMetadata);
      
      // Test the URLs
      if (document.cloudinary?.url) {
        console.log('\nTesting regular URL...');
        try {
          const response = await fetch(document.cloudinary.url);
          console.log('URL Status:', response.status);
          console.log('URL Content-Type:', response.headers.get('content-type'));
        } catch (error) {
          console.log('URL Error:', error.message);
        }
      }
      
      if (document.cloudinary?.secureUrl) {
        console.log('\nTesting secure URL...');
        try {
          const response = await fetch(document.cloudinary.secureUrl);
          console.log('Secure URL Status:', response.status);
          console.log('Secure URL Content-Type:', response.headers.get('content-type'));
        } catch (error) {
          console.log('Secure URL Error:', error.message);
        }
      }
      
    } else {
      console.log('Document not found with ID: 686a925190f8e0993dfa7187');
      
      // Show all documents in the project
      const projectDocs = await documents.find({ 
        projectId: require('mongodb').ObjectId('6866d7d7d74ea8009961c633') 
      }).toArray();
      
      console.log('Documents in project:');
      projectDocs.forEach(doc => {
        console.log(`- ${doc._id}: ${doc.filename} (${doc.cloudinary?.secureUrl})`);
      });
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.close();
  }
}

checkDocumentUrls();
