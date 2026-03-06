"use client";

import { useState, useEffect } from "react";
import { chatService } from "@/lib/services/chatService";

export default function DebugPage() {
  const [userId, setUserId] = useState<string>("");
  const [query, setQuery] = useState("Who are the authors?");
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setUserId(chatService.getUserId());
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const runTest = async (testName: string, endpoint: string, body?: any) => {
    addLog(`Starting: ${testName}`);
    try {
      const response = await fetch(endpoint, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      addLog(`✓ ${testName} completed`);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`✗ ${testName} failed: ${msg}`);
      throw error;
    }
  };

  const handleTestRAG = async () => {
    if (!userId) return;
    setLoading(true);
    setTestResults(null);
    setLogs([]);

    try {
      const result = await runTest(
        "RAG Retrieval Test",
        `/api/debug/rag?userId=${encodeURIComponent(userId)}&query=${encodeURIComponent(query)}`,
      );
      setTestResults({ test: "RAG", result });
    } catch (error) {
      setTestResults({ test: "RAG", error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleTestOrchestrator = async () => {
    if (!userId) return;
    setLoading(true);
    setTestResults(null);
    setLogs([]);

    try {
      const result = await runTest(
        "Orchestrator Test",
        "/api/debug/test-orchestrator",
        {
          userId,
          query,
        },
      );
      setTestResults({ test: "Orchestrator", result });
    } catch (error) {
      setTestResults({ test: "Orchestrator", error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-slate-700 pb-6">
          <h1 className="text-3xl font-bold mb-2">🔧 System Debug</h1>
          <p className="text-slate-400">Test RAG system and orchestrator</p>
        </div>

        {/* User ID Display */}
        <div className="bg-slate-800 rounded border border-slate-700 p-4">
          <label className="block text-sm font-semibold mb-2">
            Your User ID
          </label>
          <div className="bg-slate-900 rounded p-3 text-slate-300 font-mono text-sm break-all">
            {userId || "Loading..."}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-slate-800 rounded border border-slate-700 p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Test Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white text-sm"
              placeholder="Enter test query..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleTestRAG}
              disabled={loading || !userId}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded font-semibold transition text-sm"
            >
              {loading ? "Testing..." : "Test RAG"}
            </button>
            <button
              onClick={handleTestOrchestrator}
              disabled={loading || !userId}
              className="py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded font-semibold transition text-sm"
            >
              {loading ? "Testing..." : "Test Orchestrator"}
            </button>
          </div>
        </div>

        {/* Results */}
        {testResults && (
          <div className="bg-slate-800 rounded border border-slate-700 p-4">
            <h2 className="font-bold mb-3">Results: {testResults.test}</h2>
            <div className="bg-slate-900 rounded p-3 text-slate-300 text-sm font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
              {testResults.error ? (
                <span className="text-red-400">Error: {testResults.error}</span>
              ) : (
                JSON.stringify(testResults.result, null, 2)
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-slate-800 rounded border border-slate-700 p-4">
            <h2 className="font-bold mb-3">Execution Logs</h2>
            <div className="bg-slate-900 rounded p-3 text-slate-300 text-xs font-mono max-h-64 overflow-y-auto space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes("✗")
                      ? "text-red-400"
                      : log.includes("✓")
                        ? "text-green-400"
                        : ""
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded p-4 text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              First upload a document on the{" "}
              <a href="/documents" className="text-blue-400 hover:underline">
                /documents
              </a>{" "}
              page
            </li>
            <li>Copy your User ID from the field above</li>
            <li>Enter a query (e.g. "Who are the authors?")</li>
            <li>Click "Test RAG" to check if documents are being retrieved</li>
            <li>Click "Test Orchestrator" to test the full system</li>
            <li>Check logs to see what's happening at each step</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
