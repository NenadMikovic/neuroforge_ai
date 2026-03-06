"use client";

import { useEffect, useState } from "react";
import { chatService } from "@/lib/services/chatService";

export default function RAGTestPage() {
  const [userId, setUserId] = useState<string>("");
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [ragTest, setRagTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = chatService.getUserId();
    setUserId(id);
  }, []);

  const testDatabase = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/debug/database?userId=${userId}`);
      const data = await response.json();
      setDbInfo(data);
      console.log("Database info:", data);
    } catch (error) {
      console.error("Database test failed:", error);
      setDbInfo({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testRAGRetrieval = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/debug/rag?userId=${userId}&query=authors`,
      );
      const data = await response.json();
      setRagTest(data);
      console.log("RAG test:", data);
    } catch (error) {
      console.error("RAG test failed:", error);
      setRagTest({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-100">RAG System Test</h1>

        <div className="bg-slate-800 rounded p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-400">Your User ID:</p>
            <p className="text-lg font-mono bg-slate-900 p-2 rounded text-slate-200">
              {userId || "Loading..."}
            </p>
          </div>

          <button
            onClick={testDatabase}
            disabled={loading || !userId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Testing..." : "Test Database"}
          </button>

          {dbInfo && (
            <div className="bg-slate-900 rounded p-4 space-y-2">
              <h2 className="font-bold text-slate-200">Database Summary</h2>
              <pre className="text-xs text-slate-300 overflow-auto">
                {JSON.stringify(dbInfo.summary, null, 2)}
              </pre>

              {dbInfo.error && (
                <p className="text-red-400">Error: {dbInfo.error}</p>
              )}

              {dbInfo.allDocuments?.length > 0 && (
                <div>
                  <p className="text-slate-300 font-semibold">All Documents:</p>
                  <pre className="text-xs text-slate-300 overflow-auto bg-slate-800 p-2 rounded">
                    {JSON.stringify(dbInfo.allDocuments, null, 2)}
                  </pre>
                </div>
              )}

              {dbInfo.userDocuments?.length > 0 && (
                <div>
                  <p className="text-slate-300 font-semibold">
                    Your Documents:
                  </p>
                  <pre className="text-xs text-slate-300 overflow-auto bg-slate-800 p-2 rounded">
                    {JSON.stringify(dbInfo.userDocuments, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded p-6 space-y-4">
          <button
            onClick={testRAGRetrieval}
            disabled={loading || !userId}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Testing..." : "Test RAG Retrieval (query: 'authors')"}
          </button>

          {ragTest && (
            <div className="bg-slate-900 rounded p-4">
              <h2 className="font-bold text-slate-200 mb-2">
                RAG Retrieval Test
              </h2>

              {ragTest.error && (
                <p className="text-red-400">Error: {ragTest.error}</p>
              )}

              <pre className="text-xs text-slate-300 overflow-auto bg-slate-800 p-2 rounded">
                {JSON.stringify(ragTest, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-slate-700 rounded p-6 text-slate-200 text-sm space-y-2">
          <h2 className="font-bold">Troubleshooting Guide:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              If "All Documents" is empty, documents are NOT being saved to the
              database
            </li>
            <li>
              If "Your Documents" is empty but "All Documents" has items, the
              userId is different
            </li>
            <li>
              If RAG Retrieval returns 0 chunks, the vector retrieval isn't
              finding them
            </li>
            <li>Check the browser console for detailed error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
