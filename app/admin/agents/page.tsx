/**
 * Agent Inspector
 * /admin/agents - Monitor agent execution and performance
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentLog {
  id: string;
  timestamp: string;
  agentType: string;
  status: "success" | "failure" | "partial" | "timeout";
  prompt: string;
  response: string;
  duration: number;
  model: string;
  tokensUsed: number;
  toolsCalled: string[];
  error?: string;
}

export default function AgentInspector() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // Fetch real agent logs from API
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/agents/metrics?metric=logs");
        const data = await response.json();

        // Transform API response to match AgentLog interface
        if (data.logs && Array.isArray(data.logs)) {
          const transformedLogs = data.logs.map((log: any) => ({
            id: log.id,
            timestamp: log.createdAt,
            agentType: log.agentType,
            status:
              log.status === "error"
                ? "failure"
                : log.status === "success"
                  ? "success"
                  : log.status === "timeout"
                    ? "timeout"
                    : "partial",
            prompt:
              typeof log.input === "string"
                ? log.input
                : JSON.stringify(log.input),
            response: log.output ? JSON.stringify(log.output) : "",
            duration: log.executionTime || 0,
            model:
              log.modelUsed ||
              log.metadata?.modelUsed ||
              log.metadata?.model ||
              log.metadata?.llm?.model ||
              "mistral",
            tokensUsed: log.tokenUsage || 0,
            toolsCalled: Array.isArray(log.toolsCalled)
              ? log.toolsCalled
              : Array.isArray(log.metadata?.toolsCalled)
                ? log.metadata.toolsCalled
                : Array.isArray(log.metadata?.toolCalls)
                  ? log.metadata.toolCalls
                  : [],
            error: log.errorMessage || undefined,
          }));
          setLogs(transformedLogs);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error("[Agent Inspector] Failed to fetch logs:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) =>
    filter === "all" ? true : log.status === filter,
  );

  // Calculate counts for each status
  const statusCounts = {
    all: logs.length,
    success: logs.filter((log) => log.status === "success").length,
    failure: logs.filter((log) => log.status === "failure").length,
    partial: logs.filter((log) => log.status === "partial").length,
    timeout: logs.filter((log) => log.status === "timeout").length,
  };

  const statusColor = {
    success: "bg-green-500/20 text-green-400 border-green-500/50",
    failure: "bg-red-500/20 text-red-400 border-red-500/50",
    partial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    timeout: "bg-gray-500/20 text-gray-400 border-gray-500/50",
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
          <h1 className="text-4xl font-bold mb-2">Agent Inspector</h1>
          <p className="text-gray-400">
            Monitor agent execution and performance
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          {["all", "success", "failure", "partial", "timeout"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg border transition ${
                filter === status
                  ? "bg-slate-700 border-slate-600 text-white"
                  : "bg-slate-900/50 border-slate-700 text-gray-400 hover:text-gray-300"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} (
              {statusCounts[status as keyof typeof statusCounts]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading agent logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No agent logs available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Log List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedLog?.id === log.id
                      ? "bg-slate-800 border-blue-500"
                      : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{log.agentType}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded border text-xs font-semibold ${statusColor[log.status]}`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">
                    {log.prompt.slice(0, 100)}...
                  </p>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>⏱️ {log.duration}ms</span>
                    <span>🎯 {log.model}</span>
                    <span>📝 {log.tokensUsed} tokens</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Detailed View */}
            {selectedLog && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 lg:sticky lg:top-8 h-fit">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">
                  Execution Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Agent Type
                    </p>
                    <p className="font-semibold">{selectedLog.agentType}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Status
                    </p>
                    <div
                      className={`inline-block px-3 py-1 rounded border text-sm font-semibold ${statusColor[selectedLog.status]}`}
                    >
                      {selectedLog.status.toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Model
                    </p>
                    <p className="font-mono text-sm">{selectedLog.model}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Duration
                    </p>
                    <p className="font-semibold">{selectedLog.duration}ms</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Tokens Used
                    </p>
                    <p className="font-semibold">{selectedLog.tokensUsed}</p>
                  </div>

                  {selectedLog.toolsCalled.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Tools Called
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLog.toolsCalled.map((tool, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-slate-800 border border-slate-600 text-xs rounded"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">
                      Prompt
                    </p>
                    <div className="bg-slate-950 p-3 rounded text-xs font-mono text-gray-300 max-h-32 overflow-y-auto">
                      {selectedLog.prompt}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">
                      Response
                    </p>
                    <div className="bg-slate-950 p-3 rounded text-xs font-mono text-gray-300 max-h-32 overflow-y-auto">
                      {selectedLog.response}
                    </div>
                  </div>

                  {selectedLog.error && (
                    <div>
                      <p className="text-xs text-red-500 uppercase mb-2">
                        Error
                      </p>
                      <div className="bg-red-950/30 p-3 rounded text-xs font-mono text-red-300 border border-red-500/30">
                        {selectedLog.error}
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
