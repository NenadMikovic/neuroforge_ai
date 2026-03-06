"use client";

import React, { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/utils/toast";

interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  chunkCount: number;
  uploadedAt: string;
}

interface DocumentSidebarProps {
  userId: string;
  onDocumentsLoaded?: (documents: DocumentInfo[]) => void;
}

export function DocumentSidebar({
  userId,
  onDocumentsLoaded,
}: DocumentSidebarProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const result = await response.json();
      setDocuments(result.documents || []);

      if (onDocumentsLoaded) {
        onDocumentsLoaded(result.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      showErrorToast("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      showSuccessToast("Document deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete document";
      showErrorToast(errorMessage);
    }
  };

  const reindexDocument = async (docId: string) => {
    setReindexingId(docId);
    try {
      const response = await fetch(
        `/api/documents/${docId}/reindex?userId=${userId}`,
        { method: "POST" },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reindex document");
      }

      showSuccessToast("Document reindexed successfully");
      await fetchDocuments();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reindex document";
      showErrorToast(errorMessage);
    } finally {
      setReindexingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-400">
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.length === 0 ? (
        <div className="text-xs text-slate-500 p-4 text-center">
          No documents uploaded yet
        </div>
      ) : (
        documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-slate-700/50 rounded border border-slate-600 hover:border-cyan-500/50 transition"
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === doc.id ? null : doc.id)
              }
              className="w-full text-left p-3 flex items-start justify-between hover:bg-slate-700/30 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {doc.chunkCount} chunks • {doc.type.toUpperCase()}
                </p>
              </div>
              <div className="text-slate-400 ml-2">
                {expandedId === doc.id ? "▼" : "▶"}
              </div>
            </button>

            {expandedId === doc.id && (
              <div className="border-t border-slate-600 p-3 bg-slate-800/30 space-y-2">
                <div className="text-xs text-slate-400">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reindexDocument(doc.id)}
                    disabled={reindexingId === doc.id}
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-2 py-1 rounded transition"
                  >
                    {reindexingId === doc.id ? "Reindexing..." : "Reindex"}
                  </button>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    disabled={reindexingId === doc.id}
                    className="flex-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white px-2 py-1 rounded transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default DocumentSidebar;
