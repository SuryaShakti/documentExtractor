// Test Cloudinary configuration
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dyjd0hssi',
  api_key: '457629728783651',
  api_secret: 'J85DaE0UWOjkKZG5o84BHRK-JU4'
});

async function testCloudinary() {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Test basic connection
    const result = await cloudinary.api.ping();
    console.log('Cloudinary ping result:', result);
    
    // Search for documents with public ID containing "rgnqyb8bqatkcl1jy6fq"
    console.log('\nSearching for your document...');
    const searchResult = await cloudinary.search
      .expression('public_id:*rgnqyb8bqatkcl1jy6fq*')
      .max_results(10)
      .execute();
    
    console.log('Search results:', searchResult);
    
    if (searchResult.resources.length > 0) {
      searchResult.resources.forEach(resource => {
        console.log('Found resource:');
        console.log('- Public ID:', resource.public_id);
        console.log('- URL:', resource.url);
        console.log('- Secure URL:', resource.secure_url);
        console.log('- Format:', resource.format);
        console.log('- Resource Type:', resource.resource_type);
      });
    } else {
      console.log('No resources found with that public ID');
      
      // Try broader search
      console.log('\nTrying broader search for recent documents...');
      const recentDocs = await cloudinary.search
        .expression('folder:documents')
        .sort_by([['created_at', 'desc']])
        .max_results(5)
        .execute();
      
      console.log('Recent documents in folder:', recentDocs);
    }
    
  } catch (error) {
    console.error('Cloudinary error:', error);
  }
}

testCloudinary();
