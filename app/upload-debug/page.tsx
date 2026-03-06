"use client";

import { useState, useEffect } from "react";
import { chatService } from "@/lib/services/chatService";

export default function UploadDebugPage() {
  const [userId, setUserId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const id = chatService.getUserId();
    setUserId(id);
    addLog(`User ID: ${id}`);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      addLog(
        `File selected: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB, type: ${f.type})`,
      );
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) {
      setError("Missing file or userId");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);
    setLogs([]);
    addLog("Starting upload...");

    try {
      addLog(`Creating FormData with file: ${file.name}, userId: ${userId}`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      addLog("Sending POST request to /api/documents/upload");
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        // Note: Don't set Content-Type header - browser will set it with boundary
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();
      addLog(`Response received: ${JSON.stringify(data).substring(0, 100)}`);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
      addLog(
        `✓ Upload successful! Document chunks: ${data.document.chunkCount}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Error: ${msg}`);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-slate-700 pb-6">
          <h1 className="text-3xl font-bold mb-2">📤 Debug Upload</h1>
          <p className="text-slate-400">
            Test document upload with detailed logging
          </p>
        </div>

        {/* User ID */}
        <div className="bg-slate-800 rounded border border-slate-700 p-4">
          <label className="block text-sm font-semibold mb-2">
            Your User ID
          </label>
          <div className="bg-slate-900 rounded p-3 text-slate-300 font-mono text-sm break-all">
            {userId || "Loading..."}
          </div>
        </div>

        {/* File Input */}
        <div className="bg-slate-800 rounded border border-slate-700 p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700"
            />
            {file && (
              <p className="text-xs text-slate-400 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                MB)
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading || !userId}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded font-semibold transition w-full"
          >
            {uploading ? "Uploading..." : "Upload & Process"}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded p-4">
            <p className="text-red-400 font-semibold mb-2">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-green-900/30 border border-green-500 rounded p-4">
            <p className="text-green-400 font-semibold mb-3">
              ✓ Upload Successful
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Document ID:</span>
                <span className="text-slate-200 ml-2 font-mono">
                  {result.document.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400">File Name:</span>
                <span className="text-slate-200 ml-2">
                  {result.document.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Chunks:</span>
                <span className="text-slate-200 ml-2 font-bold">
                  {result.document.chunkCount}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Processing Time:</span>
                <span className="text-slate-200 ml-2">
                  {result.processingTime}ms
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-slate-800 rounded border border-slate-700 p-4">
          <p className="font-semibold mb-3">Execution Log</p>
          <div className="bg-slate-900 rounded p-3 text-slate-300 text-xs font-mono max-h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p className="text-slate-500">Logs will appear here...</p>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes("✓")
                      ? "text-green-400"
                      : log.includes("✗")
                        ? "text-red-400"
                        : "text-slate-300"
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-2">
            About SQLite Database:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your system uses SQLite - no MySQL needed</li>
            <li>
              Database file:{" "}
              <code className="text-slate-300">prisma/dev.db</code>
            </li>
            <li>Uploads are processed and stored in the database</li>
            <li>Temporary files are deleted after processing</li>
            <li>All document chunks are indexed with embeddings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
