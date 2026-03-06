/**
 * POST /api/documents/upload - Upload and process a document
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as fs from "fs";
import RAGService from "@/lib/rag/ragService";
import { getOrCreateUser } from "@/lib/db/service";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for file upload

/**
 * POST /api/documents/upload
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    // Validate inputs
    if (!file || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: file and userId" },
        { status: 400 },
      );
    }

    // Get or create user
    await getOrCreateUser(userId);

    // Validate file type
    const fileName = file.name;
    const supportedExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = path.extname(fileName).toLowerCase();

    if (!supportedExtensions.includes(fileExt)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported: ${supportedExtensions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 100MB" },
        { status: 413 },
      );
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file temporarily
    const fileId = uuidv4();
    const filePath = path.join(uploadsDir, `${fileId}-${fileName}`);

    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log(`[Upload] File saved: ${filePath}`);

    // Process document with RAG
    const ragService = new RAGService(1000, 100, 5);

    console.log("[Upload] Starting document processing...");
    const documentInfo = await ragService.indexDocument(
      filePath,
      fileName,
      userId,
    );

    // Delete temporary file after successful processing
    try {
      fs.unlinkSync(filePath);
      console.log("[Upload] Temporary file deleted");
    } catch (err) {
      console.warn("[Upload] Could not delete temporary file:", err);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        document: documentInfo,
        processingTime: duration,
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Upload Error]", {
      error: errorMessage,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
