"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUpload } from "@/app/components/DocumentUpload";
import { DocumentSidebar } from "@/app/components/DocumentSidebar";
import { DocumentAuthorViewer } from "@/app/components/DocumentAuthorViewer";
import { RetrievalMetrics } from "@/app/components/RetrievalMetrics";
import { chatService } from "@/lib/services/chatService";

export default function DocumentsPage() {
  const router = useRouter();
  const userId = chatService.getUserId();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDocumentUploaded = () => {
    // Refresh the document list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📚 Document Management</h1>
            <p className="text-slate-400">
              Upload and manage documents for RAG-enhanced conversations
            </p>
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
          >
            ← Back to Chat
          </button>
        </div>

        {/* Upload Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Upload Documents</h2>
          <p className="text-sm text-slate-400">
            Supported formats: PDF, DOCX, TXT (up to 100MB)
          </p>
          <DocumentUpload
            userId={userId}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Documents Section */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xl font-semibold">Documents</h2>
            <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
              <DocumentSidebar key={refreshKey} userId={userId} />
            </div>
          </div>

          {/* Metrics Section */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Usage</h2>
            <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
              <RetrievalMetrics key={refreshKey} userId={userId} />
            </div>
          </div>
        </div>

        {/* Document Author Info Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Document Details & Authors</h2>
          <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
            <DocumentAuthorViewer key={refreshKey} userId={userId} />
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-slate-800/30 border border-slate-700 rounded p-4 space-y-3">
          <h3 className="text-sm font-semibold">How RAG Works</h3>
          <ul className="text-xs text-slate-400 space-y-2">
            <li>
              ✓ <strong>Upload:</strong> Documents are processed and split into
              chunks
            </li>
            <li>
              ✓ <strong>Embed:</strong> Text chunks are converted to embeddings
            </li>
            <li>
              ✓ <strong>Store:</strong> Embeddings are indexed for fast
              retrieval
            </li>
            <li>
              ✓ <strong>Retrieve:</strong> When you ask a question, relevant
              chunks are found
            </li>
            <li>
              ✓ <strong>Answer:</strong> Context is injected into the prompt for
              better answers
            </li>
            <li>
              ✓ <strong>Track:</strong> Retrieval metrics show which documents
              are most useful
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
