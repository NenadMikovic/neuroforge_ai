"use client";

import React, { useState, useEffect } from "react";

interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  totalChunks: number;
  previewChunks: number;
  firstChunks: Array<{
    index: number;
    content: string;
  }>;
}

interface DocumentAuthorViewerProps {
  userId: string;
}

export function DocumentAuthorViewer({ userId }: DocumentAuthorViewerProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/info?userId=${userId}`);

      if (!response.ok) {
        throw new Error("Failed to load documents");
      }

      const data = await response.json();
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading documents...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">Error: {error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-slate-400 text-sm">
        No documents uploaded yet. Upload a document to see author information.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-slate-700/50 rounded border border-slate-600 p-4"
        >
          <div className="mb-3">
            <h3 className="font-semibold text-slate-200 wrap-break-word">
              {doc.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Type: {doc.type.toUpperCase()} | Total Chunks:{" "}
              <span className="font-bold text-slate-200">
                {doc.totalChunks}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Showing first {doc.previewChunks} chunks for preview
            </p>
          </div>

          <div className="bg-slate-800 rounded p-3 max-h-60 overflow-y-auto">
            <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
              {doc.firstChunks
                .map(
                  (chunk) =>
                    `[Chunk ${chunk.index}]\n${chunk.content.substring(0, 300)}...`,
                )
                .join("\n\n---\n\n")}
            </p>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            📅 Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
