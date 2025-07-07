// Updated upload configuration for PDFs
// Add this to your upload route around line 200 where cloudinary.uploader.upload is called

// Determine the correct resource type based on file type
const getResourceType = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return 'raw'; // PDFs should be uploaded as raw files
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'raw'; // Default to raw for documents
};

// Replace your current cloudinary upload with this:
const uploadResult = await cloudinary.uploader.upload(dataURI, {
  folder: "documents", // Use consistent folder name
  public_id: uniqueFilename.replace(/\.[^/.]+$/, ""),
  resource_type: getResourceType(file.mimetype || ""),
  // Don't let Cloudinary auto-detect format for PDFs
  format: file.mimetype === 'application/pdf' ? 'pdf' : undefined,
});

console.log('Upload completed with resource_type:', getResourceType(file.mimetype || ""));
