// Fix document upload and test extraction
const { v2: cloudinary } = require('cloudinary');
const { MongoClient } = require('mongodb');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dyjd0hssi',
  api_key: '457629728783651',
  api_secret: 'J85DaE0UWOjkKZG5o84BHRK-JU4'
});

async function uploadTestPDF() {
  try {
    console.log('Testing PDF upload with correct settings...');
    
    // Test with a simple PDF URL (you can replace this with any PDF URL)
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('Uploading test PDF to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(testPdfUrl, {
      folder: 'documents', // Use the same folder as your failing URL
      public_id: 'test_document_' + Date.now(),
      resource_type: 'raw', // Important for PDFs!
      format: 'pdf'
    });
    
    console.log('Upload successful!');
    console.log('Public ID:', uploadResult.public_id);
    console.log('URL:', uploadResult.url);
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Resource Type:', uploadResult.resource_type);
    console.log('Format:', uploadResult.format);
    
    // Test if the URL is accessible
    console.log('\\nTesting URL accessibility...');
    const response = await fetch(uploadResult.secure_url);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      console.log('✅ PDF is accessible and ready for extraction!');
      console.log('\\nNow update your database with this URL:');
      console.log('Secure URL:', uploadResult.secure_url);
      
      // Optional: Update the document in your database
      return uploadResult;
    } else {
      console.log('❌ Uploaded PDF is not accessible');
    }
    
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

async function updateDocumentInDB(newUrl) {
  const uri = 'mongodb+srv://suryashaktidev:qG4aSsyfpAFSFD4B@social-media.ofhxyn7.mongodb.net/documentExtraction?retryWrites=true&w=majority&appName=social-media';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('documentExtraction');
    const documents = db.collection('documents');
    
    const result = await documents.updateOne(
      { _id: require('mongodb').ObjectId('686a925190f8e0993dfa7187') },
      { 
        $set: { 
          'cloudinary.secureUrl': newUrl,
          'cloudinary.url': newUrl.replace('https:', 'http:')
        } 
      }
    );
    
    console.log('Database update result:', result);
    return result;
    
  } catch (error) {
    console.error('Database update failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
uploadTestPDF().then(uploadResult => {
  if (uploadResult) {
    console.log('\\nDo you want to update the database with this new URL? (run updateDocumentInDB manually)');
    console.log('New URL:', uploadResult.secure_url);
  }
});
