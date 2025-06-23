import { NextRequest } from 'next/server';
import { IncomingForm, File, Fields, Files } from 'formidable';
import { Readable } from 'stream';

// Convert NextRequest to a Node.js IncomingMessage-like object
function createIncomingMessage(req: NextRequest) {
  const body = req.body;
  
  if (!body) {
    throw new Error('Request body is null');
  }

  const readable = new Readable({
    read() {}
  });

  // Convert ReadableStream to Node.js Readable
  const reader = body.getReader();
  
  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          readable.push(null);
          break;
        }
        readable.push(Buffer.from(value));
      }
    } catch (error) {
      readable.destroy(error as Error);
    }
  };
  
  pump();

  // Mock IncomingMessage properties
  (readable as any).headers = Object.fromEntries(req.headers.entries());
  (readable as any).method = req.method;
  (readable as any).url = req.url;

  return readable as any;
}

export interface ParsedFormData {
  fields: Fields;
  files: Files;
}

export async function parseFormData(req: NextRequest): Promise<ParsedFormData> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE!) || 50 * 1024 * 1024, // 50MB default
      maxFiles: parseInt(process.env.MAX_FILES_PER_UPLOAD!) || 10,
      allowEmptyFiles: false,
      minFileSize: 1,
    });

    const incomingMessage = createIncomingMessage(req);

    form.parse(incomingMessage, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

export function validateFileType(file: File): boolean {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  return allowedMimeTypes.includes(file.mimetype || '');
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateUniqueFilename(originalName: string, userId: string): string {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  return `${userId}/${uniqueSuffix}-${nameWithoutExt}.${extension}`;
}

// Helper to convert File to upload-ready format
export function prepareFileForUpload(file: File, userId: string) {
  if (!validateFileType(file)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Only PDF, DOC, DOCX, TXT, CSV, JPG, JPEG, PNG files are allowed.`);
  }

  return {
    originalname: file.originalFilename || 'unknown',
    filename: generateUniqueFilename(file.originalFilename || 'unknown', userId),
    mimetype: file.mimetype,
    size: file.size,
    path: file.filepath,
    buffer: null // Will be read from filepath when needed
  };
}
