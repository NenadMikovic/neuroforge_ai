/**
 * Document text extraction from PDF, DOCX, and TXT files
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Use pdfjs-dist directly to avoid worker file issues
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Set worker source using absolute file URL
    const workerPath = `file://${path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")}`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

    const dataBuffer = fs.readFileSync(filePath);
    // Convert Buffer to Uint8Array as required by pdfjs-dist
    const uint8Array = new Uint8Array(dataBuffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      text += pageText + "\n";
    }

    return text.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    // Dynamically import docx to avoid ESM issues
    const { default: mammoth } = await import("mammoth");
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

/**
 * Extract text from DOCX using a simpler approach if mammoth fails
 */
async function extractTextFromDOCXSimple(filePath: string): Promise<string> {
  try {
    const { Document } = await import("docx");
    const data = fs.readFileSync(filePath);
    // Docx library doesn't provide text extraction directly
    // Fallback: read the file as is
    throw new Error("Use mammoth library for DOCX text extraction");
  } catch (error) {
    console.error("Error with simple DOCX extraction:", error);
    throw error;
  }
}

/**
 * Extract text from TXT file
 */
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error("Error extracting text from TXT:", error);
    throw new Error(`Failed to extract text from TXT: ${error}`);
  }
}

/**
 * Main document processor
 */
export class DocumentProcessor {
  /**
   * Extract text from a document based on file type
   */
  static async extractText(
    filePath: string,
    fileType: "pdf" | "docx" | "txt",
  ): Promise<string> {
    switch (fileType) {
      case "pdf":
        return extractTextFromPDF(filePath);
      case "docx":
        return extractTextFromDOCX(filePath).catch(() =>
          extractTextFromDOCXSimple(filePath),
        );
      case "txt":
        return extractTextFromTXT(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Validate file type by extension
   */
  static validateFileType(fileName: string): "pdf" | "docx" | "txt" | null {
    const ext = path.extname(fileName).toLowerCase();
    const typeMap: Record<string, "pdf" | "docx" | "txt"> = {
      ".pdf": "pdf",
      ".docx": "docx",
      ".txt": "txt",
    };
    return typeMap[ext] || null;
  }

  /**
   * Get file size in MB
   */
  static getFileSizeMB(filePath: string): number {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Remove file
   */
  static removeFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Create uploads directory if it doesn't exist
   */
  static ensureUploadsDir(uploadsDir: string): void {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  /**
   * Extract metadata from document
   */
  static extractMetadata(
    fileName: string,
    filePath: string,
    fileType: string,
  ): Record<string, any> {
    const stats = fs.statSync(filePath);
    return {
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
    };
  }
}

export default DocumentProcessor;
