"use client";

import React, { useState, useRef } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/utils/toast";

interface DocumentUploadProps {
  userId: string;
  onDocumentUploaded?: (document: any) => void;
}

export function DocumentUpload({
  userId,
  onDocumentUploaded,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!supportedTypes.includes(file.type)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx", "txt"].includes(ext || "")) {
        showErrorToast(
          "Unsupported file type. Please upload PDF, DOCX, or TXT.",
        );
        return;
      }
    }

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      showErrorToast("File size exceeds 100MB limit.");
      return;
    }

    await uploadDocument(file);
  };

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload document");
      }

      const result = await response.json();

      showSuccessToast(
        `Document "${file.name}" uploaded successfully! (${result.document.chunkCount} chunks)`,
      );

      if (onDocumentUploaded) {
        onDocumentUploaded(result.document);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload document";
      showErrorToast(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadDocument(files[0]);
    }
  };

  return (
    <div
      className="border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-cyan-500 transition cursor-pointer"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      <div className="text-center">
        {isUploading ? (
          <>
            <div className="mb-2 text-sm text-cyan-400">
              Uploading and processing...
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm text-slate-300">
              Click or drag PDF, DOCX, or TXT files here
            </p>
            <p className="text-xs text-slate-500 mt-1">Maximum size: 100MB</p>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentUpload;
