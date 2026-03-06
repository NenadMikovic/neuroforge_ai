"use client";

import { useEffect, useState } from "react";

export default function DiagnosticsPage() {
  const [userId, setUserId] = useState<string>("");
  const [step, setStep] = useState(0);
  const [dbCount, setDbCount] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get userId from localStorage
    const storageKey = "chat_user_id";
    const id = localStorage.getItem(storageKey);
    if (id) {
      setUserId(id);
    } else {
      setUserId("NOT FOUND - need to chat first");
    }
  }, []);

  const checkDatabase = async () => {
    if (!userId || userId.includes("NOT FOUND")) {
      alert("userId not found. Please chat first to initialize userId.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/debug/count?userId=${userId}`);
      const data = await response.json();
      setDbCount(data);
      setStep(1);
    } catch (error) {
      console.error("Error checking database:", error);
      alert("Failed to check database: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-100 mb-8">
          🔍 RAG System Diagnostics
        </h1>

        {/* Step 0: Current Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Step 0: Your User ID
          </h2>
          <div className="space-y-2">
            <p className="text-slate-300">
              Current User ID (from localStorage):
            </p>
            <div className="bg-slate-900 border border-slate-600 rounded p-3">
              <code className="text-slate-200 text-sm break-all">{userId}</code>
            </div>
            {userId.includes("NOT FOUND") && (
              <p className="text-orange-400 text-sm">
                ⚠️ userId not found! You need to chat first to initialize it.
              </p>
            )}
          </div>
        </div>

        {/* Step 1: Database State */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Step 1: Check Database
          </h2>

          <button
            onClick={checkDatabase}
            disabled={loading || userId.includes("NOT FOUND")}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-2 rounded font-semibold transitional"
          >
            {loading ? "Checking..." : "Check Database"}
          </button>

          {dbCount && (
            <div className="mt-4 space-y-4">
              <div className="bg-slate-900 rounded p-4 space-y-2">
                <p className="text-slate-300">
                  📊 <strong>Entire Database:</strong>
                </p>
                <p className="text-slate-400">
                  Total Documents:{" "}
                  <span className="text-slate-100 font-bold">
                    {dbCount.database.totalDocuments}
                  </span>
                </p>
                <p className="text-slate-400">
                  Total Chunks:{" "}
                  <span className="text-slate-100 font-bold">
                    {dbCount.database.totalChunks}
                  </span>
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 space-y-2">
                <p className="text-slate-300">
                  👤{" "}
                  <strong>
                    Your Data (userId: {userId.substring(0, 8)}...):
                  </strong>
                </p>
                <p className="text-slate-400">
                  Your Documents:{" "}
                  <span className="text-slate-100 font-bold">
                    {dbCount.user.documentCount}
                  </span>
                </p>
                <p className="text-slate-400">
                  Your Chunks:{" "}
                  <span className="text-slate-100 font-bold">
                    {dbCount.user.chunkCount}
                  </span>
                </p>
              </div>

              {dbCount.user.documentCount === 0 &&
                dbCount.database.totalDocuments > 0 && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-4">
                    <p className="text-red-400 font-semibold">
                      ❌ Problem Found: Documents exist but NOT for your userId!
                    </p>
                    <p className="text-red-300 text-sm mt-2">
                      This means documents were uploaded with a DIFFERENT userId
                      than you're currently using.
                    </p>
                  </div>
                )}

              {dbCount.user.documentCount > 0 &&
                dbCount.user.chunkCount === 0 && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-4">
                    <p className="text-red-400 font-semibold">
                      ❌ Problem Found: Documents exist but chunks were NOT
                      created!
                    </p>
                    <p className="text-red-300 text-sm mt-2">
                      Chunk generation failed. Check the upload console logs.
                    </p>
                  </div>
                )}

              {dbCount.user.documentCount > 0 &&
                dbCount.user.chunkCount > 0 && (
                  <div className="bg-green-900/20 border border-green-700 rounded p-4">
                    <p className="text-green-400 font-semibold">
                      ✅ Success: Documents and chunks found!
                    </p>
                    <p className="text-green-300 text-sm mt-2">
                      Your documents are properly indexed. Try asking the chat a
                      question about them.
                    </p>
                  </div>
                )}

              {dbCount.yourDocuments && dbCount.yourDocuments.length > 0 && (
                <div className="bg-slate-900 rounded p-4">
                  <p className="text-slate-300 font-semibold mb-2">
                    Your Documents:
                  </p>
                  <ul className="space-y-1 text-sm text-slate-400">
                    {dbCount.yourDocuments.map((doc: any) => (
                      <li key={doc.id}>
                        📄 {doc.name} ({doc.chunkCount} chunks)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Next Actions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Next Steps
          </h2>

          {dbCount?.user?.documentCount === 0 ? (
            <div className="space-y-3">
              <p className="text-slate-300">
                1. Go to{" "}
                <a href="/upload-debug" className="text-blue-400 underline">
                  /upload-debug
                </a>{" "}
                and upload a document
              </p>
              <p className="text-slate-300">
                2. After upload succeeds, come back here and click "Check
                Database" again
              </p>
              <p className="text-slate-300">
                3. Look for your document in the list above
              </p>
            </div>
          ) : dbCount?.user?.chunkCount === 0 ? (
            <div className="space-y-3">
              <p className="text-red-400">
                ⚠️ Document exists but chunks are missing!
              </p>
              <p className="text-slate-300">
                Check the server logs for errors during chunk generation
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-green-400">✅ Everything looks good!</p>
              <p className="text-slate-300">
                Try asking the chat: "Who are the authors of my document?"
              </p>
              <p className="text-slate-300">
                Or visit{" "}
                <a href="/debug" className="text-blue-400 underline">
                  /debug
                </a>{" "}
                to test RAG retrieval directly
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
