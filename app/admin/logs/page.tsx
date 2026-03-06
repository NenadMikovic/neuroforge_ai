/**
 * System Logs
 * /admin/logs - Structured logs and error tracking
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  module: string;
  message: string;
  error?: {
    category: string;
    severity: string;
    originalMessage: string;
  };
  context?: {
    userId?: string;
    conversationId?: string;
    requestId?: string;
    operation?: string;
    duration?: number;
  };
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allModules, setAllModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/logs?limit=200");

      if (!response.ok) {
        throw new Error("Failed to fetch system logs");
      }

      const data = await response.json();

      setLogs(data.logs || []);
      setAllModules(data.modules || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err instanceof Error ? err.message : "Failed to load logs");
      setLogs([]);
      setAllModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const levels = ["all", "debug", "info", "warn", "error", "fatal"];
  const modules = ["all", ...allModules];

  const filteredLogs = logs.filter((log) => {
    const matchLevel = levelFilter === "all" || log.level === levelFilter;
    const matchModule = moduleFilter === "all" || log.module === moduleFilter;
    const matchSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.error?.originalMessage || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchLevel && matchModule && matchSearch;
  });

  const levelColor = {
    debug: "text-gray-400 bg-gray-500/10 border-gray-500/30",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    warn: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    error: "text-red-400 bg-red-500/10 border-red-500/30",
    fatal: "text-red-600 bg-red-500/20 border-red-500/50",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Logs</h1>
              <p className="text-gray-400">
                Structured logs and error tracking
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6">
            <p className="font-semibold">Error loading logs</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Log Level</p>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level === "all" ? "All Levels" : level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Module</p>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module === "all" ? "All Modules" : module}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading system logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No logs found</p>
            <p className="text-gray-500 text-sm">
              {logs.length === 0
                ? "No system logs available yet. Logs will appear as the system is used."
                : "No logs match your current filters. Try adjusting the filters above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Log List */}
            <div className="lg:col-span-2 space-y-2">
              {filteredLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() =>
                    setSelectedLog(selectedLog?.id === log.id ? null : log)
                  }
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedLog?.id === log.id
                      ? "bg-slate-800 border-blue-500"
                      : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded border font-semibold text-xs whitespace-nowrap ${levelColor[log.level]}`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{log.module}</p>
                      <p className="text-sm text-gray-300 truncate">
                        {log.message}
                      </p>
                      {log.error && (
                        <p className="text-xs text-red-400 mt-1 truncate">
                          {log.error.category}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Detailed View */}
            {selectedLog && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 lg:sticky lg:top-8 h-fit">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">
                  Log Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Timestamp
                    </p>
                    <p className="text-sm font-mono">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Level
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded border font-semibold text-xs ${levelColor[selectedLog.level]}`}
                    >
                      {selectedLog.level.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Module
                    </p>
                    <p className="font-semibold">{selectedLog.module}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Message
                    </p>
                    <p className="text-sm text-gray-300">
                      {selectedLog.message}
                    </p>
                  </div>

                  {selectedLog.context && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Context
                      </p>
                      <div className="bg-slate-950 p-3 rounded text-xs space-y-1">
                        {selectedLog.context.userId && (
                          <p>
                            <span className="text-gray-500">User ID:</span>{" "}
                            <span className="text-gray-300 font-mono">
                              {selectedLog.context.userId}
                            </span>
                          </p>
                        )}
                        {selectedLog.context.conversationId && (
                          <p>
                            <span className="text-gray-500">Conversation:</span>{" "}
                            <span className="text-gray-300 font-mono">
                              {selectedLog.context.conversationId}
                            </span>
                          </p>
                        )}
                        {selectedLog.context.requestId && (
                          <p>
                            <span className="text-gray-500">Request ID:</span>{" "}
                            <span className="text-gray-300 font-mono">
                              {selectedLog.context.requestId}
                            </span>
                          </p>
                        )}
                        {selectedLog.context.operation && (
                          <p>
                            <span className="text-gray-500">Operation:</span>{" "}
                            <span className="text-gray-300">
                              {selectedLog.context.operation}
                            </span>
                          </p>
                        )}
                        {selectedLog.context.duration && (
                          <p>
                            <span className="text-gray-500">Duration:</span>{" "}
                            <span className="text-gray-300">
                              {selectedLog.context.duration}ms
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLog.error && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Error Details
                      </p>
                      <div className="bg-red-950/30 border border-red-500/30 p-3 rounded text-xs space-y-1">
                        <p>
                          <span className="text-red-400">Category:</span>{" "}
                          <span className="font-mono">
                            {selectedLog.error.category}
                          </span>
                        </p>
                        <p>
                          <span className="text-red-400">Severity:</span>{" "}
                          <span className="font-mono">
                            {selectedLog.error.severity}
                          </span>
                        </p>
                        <p>
                          <span className="text-red-400">Message:</span>{" "}
                          <span className="text-red-300 font-mono">
                            {selectedLog.error.originalMessage}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
