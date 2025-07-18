import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractionColumn {
  id: string;
  name: string;
  prompt: string;
  type:
    | "text"
    | "date"
    | "price"
    | "location"
    | "person"
    | "organization"
    | "status"
    | "collection";
  aiModel: string;
}

export interface ExtractionResult {
  columnId: string;
  value: string;
  confidence: number;
  extractedBy: {
    method: "ai";
    model: string;
    version: string;
  };
}

export class OpenAIExtractionService {
  private static instance: OpenAIExtractionService;

  static getInstance(): OpenAIExtractionService {
    if (!OpenAIExtractionService.instance) {
      OpenAIExtractionService.instance = new OpenAIExtractionService();
    }
    return OpenAIExtractionService.instance;
  }

  async extractDataFromDocument(
    documentText: string,
    documentUrl: string,
    columns: ExtractionColumn[]
  ): Promise<ExtractionResult[]> {
    if (!columns || columns.length === 0) {
      throw new Error("No columns provided for extraction");
    }

    console.log("Starting PDF extraction with columns:", columns.length);
    console.log("Document text length:", documentText.length);
    console.log("Document text preview:", documentText.substring(0, 200));

    const results: ExtractionResult[] = [];

    // Process each column extraction
    for (const column of columns) {
      try {
        console.log(
          `Processing column: ${column.name} with prompt: ${column.prompt}`
        );
        const result = await this.extractSingleField(
          documentText,
          documentUrl,
          column
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to extract data for column ${column.id}:`, error);
        // Add a failed result to maintain consistency
        results.push({
          columnId: column.id,
          value: "",
          confidence: 0,
          extractedBy: {
            method: "ai",
            model: column.aiModel,
            version: "1.0",
          },
        });
      }
    }

    return results;
  }

  private async extractSingleField(
    documentText: string,
    documentUrl: string,
    column: ExtractionColumn
  ): Promise<ExtractionResult> {
    const model = this.getOpenAIModel(column.aiModel);
    const systemPrompt = this.createSystemPrompt();
    const userPrompt = this.createUserPrompt(
      documentText,
      column.prompt,
      column.name
    );

    try {
      console.log(`Extracting field: ${column.name} using model: ${model}`);
      console.log(`Custom prompt: ${column.prompt}`);

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0].message.content;
      console.log(`OpenAI response for ${column.name}:`, response);

      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const parsedResponse = JSON.parse(response);
      console.log(`Parsed response for ${column.name}:`, parsedResponse);

      return {
        columnId: column.id,
        value: parsedResponse.value || "",
        confidence: Math.min(Math.max(parsedResponse.confidence || 0, 0), 1),
        extractedBy: {
          method: "ai",
          model: model,
          version: "1.0",
        },
      };
    } catch (error: any) {
      console.error(`OpenAI extraction error for ${column.name}:`, error);
      if (error.response) {
        console.error("OpenAI API response:", error.response.data);
      }
      throw new Error(
        `OpenAI extraction failed for ${column.name}: ${error.message}`
      );
    }
  }

  private getOpenAIModel(aiModel: string): string {
    switch (aiModel.toLowerCase()) {
      case "gpt-4":
        return "gpt-4-turbo-preview";
      case "gpt-3.5-turbo":
        return "gpt-3.5-turbo";
      default:
        return "gpt-3.5-turbo"; // Default fallback
    }
  }

  private createSystemPrompt(): string {
    return `You are a professional PDF document data extraction AI. Your task is to extract specific information from PDF document text with high accuracy.

IMPORTANT INSTRUCTIONS:
1. Always respond with valid JSON format: {"value": "extracted_value", "confidence": 0.95}
2. The confidence score must be between 0 and 1 (0 = no confidence, 1 = absolute confidence)
3. If you cannot find the requested information, return {"value": "", "confidence": 0}
4. Be precise and extract only the specific information requested
5. Analyze the ACTUAL PDF document content provided, not assumptions
6. Extract information exactly as it appears in the document
7. The user can ask for ANYTHING - summaries, specific data points, dates, names, etc.
8. Follow the user's custom extraction prompt exactly

You can extract:
- Text summaries and content
- Specific data points (names, dates, amounts, etc.)
- Key information and insights
- Any content the user specifically requests

Base your extraction ONLY on the actual PDF content provided.`;
  }

  private createUserPrompt(
    documentText: string,
    customPrompt: string,
    fieldName: string
  ): string {
    // Truncate document text if too long to fit within token limits
    const maxTextLength = 12000; // Leaving room for other prompt parts
    const truncatedText =
      documentText.length > maxTextLength
        ? documentText.substring(0, maxTextLength) +
          "...[TRUNCATED DUE TO LENGTH - CONTINUE ANALYSIS WITH AVAILABLE TEXT]"
        : documentText;

    return `PDF DOCUMENT CONTENT:
${truncatedText}

EXTRACTION REQUEST:
Field Name: ${fieldName}
User's Instructions: ${customPrompt}

Please analyze the PDF document content above and extract the information requested in the user's instructions: "${customPrompt}"

IMPORTANT: 
- Base your extraction ONLY on the actual PDF document content provided above
- Follow the user's custom instructions exactly
- The user can ask for any type of information (summaries, specific data, analysis, etc.)
- Extract exactly what the user requested, nothing more, nothing less

Return your response as JSON with this exact format:
{
  "value": "the_extracted_information_here",
  "confidence": 0.95
}

If you cannot find the requested information in the PDF document, return:
{
  "value": "",
  "confidence": 0
}`;
  }

  async processDocumentContent(documentUrl: string): Promise<string> {
    console.log("Processing PDF document URL:", documentUrl);

    try {
      // Fetch the PDF document
      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      console.log("Document content type:", contentType);

      // Ensure it's a PDF
      if (!contentType.includes("application/pdf")) {
        throw new Error(
          `Expected PDF document, got: ${contentType}. Only PDF documents are supported.`
        );
      }

      // Extract text from PDF
      return await this.extractTextFromPDF(documentUrl);
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error;
    }
  }

  private async extractTextFromPDF(documentUrl: string): Promise<string> {
    console.log("Extracting text from PDF using pdf-parse library");

    try {
      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      // Get the PDF as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      // Convert ArrayBuffer to Buffer for pdf-parse
      const buffer = Buffer.from(arrayBuffer);
      
      console.log("PDF buffer size:", buffer.length);
      console.log("Buffer type:", typeof buffer);
      console.log("Is Buffer:", Buffer.isBuffer(buffer));
      
      // Use require instead of dynamic import for better compatibility
      const pdfParse = require('pdf-parse');
      
      console.log("pdf-parse imported:", typeof pdfParse);
      
      // Parse the PDF with explicit options
      const data = await pdfParse(buffer, {
        // Ensure we're treating this as a buffer, not a file path
        version: 'v1.10.100',
        max: 0, // Parse all pages
      });
      
      console.log("Extracted PDF text length:", data.text.length);
      console.log("PDF pages:", data.numpages);
      console.log("PDF info:", data.info);
      console.log("First 500 characters of extracted text:", data.text.substring(0, 500));
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("No text content could be extracted from the PDF");
      }
      
      return data.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      console.error("Error stack:", error.stack);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  // Method to estimate extraction cost
  estimateExtractionCost(
    documentLength: number,
    columnCount: number,
    model: string = "gpt-3.5-turbo"
  ): { estimatedTokens: number; estimatedCost: number } {
    const documentTokens = Math.ceil(documentLength / 4);
    const promptTokens = 500;
    const responseTokens = 100;

    const totalTokensPerColumn = documentTokens + promptTokens + responseTokens;
    const totalTokens = totalTokensPerColumn * columnCount;

    const costPer1KTokens = model.includes("gpt-4") ? 0.03 : 0.002;
    const estimatedCost = (totalTokens / 1000) * costPer1KTokens;

    return {
      estimatedTokens: totalTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }
}

export const openaiService = OpenAIExtractionService.getInstance();
