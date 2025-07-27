// Scenario 1 : User comes and uploads the doc

const payloadUploadDoc = {
  projectId: "12345",
  defaultAiSettings: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1500,
  },
  documentCollectionId: "67890bc-1234-5678-90abcdef1234",
  docsIds: ["doc1", "doc2", "doc3"],
  columns: [
    {
      name: "docId",
      type: "string",
      description: "doc1",
      prompt: "Unique identifier for the document",
    },
    {
      name: "docName",
      type: "string",
      description: "Document 1",
      prompt: "Name of the document",
    },
    {
      name: "docContent",
      type: "text",
      description: "This is the content of Document 1.",
      prompt: "Content of the document",
    },
  ],
  "67890bc-1234-5678-90abcdef1234": {
    docId: {
      name: "docId",
      type: "string",
      description: "doc1",
      prompt: "Unique identifier for the document",
    },
    docName: {
      name: "docName",
      type: "string",
      description: "Document 1",
      prompt: "Name of the document",
    },
    docContent: {
      name: "docContent",
      type: "text",
      description: "This is the content of Document 1.",
      prompt: "Content of the document",
    },
    docTags: {
      name: "docTags",
      type: "array",
      description: "Tags associated with the document",
      prompt: "Tags for categorizing the document",
    },
  },
};
