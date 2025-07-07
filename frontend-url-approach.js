// Frontend modification - send document URL directly
// Add this to your frontend extraction logic

// Instead of just sending projectId and documentId:
const extractData = async (projectId, documentId) => {
  // Get the document details first to get the URL
  const documentResponse = await fetch(`/api/projects/${projectId}/documents/${documentId}`);
  const documentData = await documentResponse.json();
  
  // Send the URL along with the IDs
  const response = await fetch('/api/extract-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      projectId,
      documentId,
      documentUrl: documentData.document.cloudinary.secureUrl // Send the URL directly
    })
  });
  
  return response.json();
};

// Alternative: Even simpler - just send URL without DB lookup
const extractDataDirect = async (documentUrl, projectId, documentId) => {
  const response = await fetch('/api/extract-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      projectId,
      documentId,
      documentUrl // User provides URL directly
    })
  });
  
  return response.json();
};
