/**
 * Tool Explorer
 * /admin/tools - Browse tool execution history and stats
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ToolExecution {
  id: string;
  toolName: string;
  timestamp: string;
  duration: number;
  status: "success" | "failure" | "timeout";
  input: string;
  output: string;
  error?: string;
  agentType: string;
}

interface ToolStats {
  name: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  successRate: number;
}

export default function ToolExplorer() {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [stats, setStats] = useState<ToolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] =
    useState<ToolExecution | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const fetchToolData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/tools?limit=200");
      if (!response.ok) {
        throw new Error("Failed to fetch tool execution data");
      }

      const data = await response.json();
      setExecutions(data.executions || []);
      setStats(data.stats || []);
    } catch (err) {
      console.error("[ToolExplorer] Failed to fetch tools data:", err);
      setError(err instanceof Error ? err.message : "Failed to load tool data");
      setExecutions([]);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolData();
  }, []);

  const filteredExecutions = selectedTool
    ? executions.filter((e) => e.toolName === selectedTool)
    : executions;

  const statusColor = {
    success: "bg-green-500/20 text-green-400 border-green-500/50",
    failure: "bg-red-500/20 text-red-400 border-red-500/50",
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Tool Explorer</h1>
              <p className="text-gray-400">
                Analyze tool execution history and performance
              </p>
            </div>
            <button
              onClick={fetchToolData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6">
            <p className="font-semibold">Error loading tool data</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading tool data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tool Stats */}
            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Tools</h2>
              {stats.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 text-center text-gray-400 text-sm">
                  No tool statistics available yet
                </div>
              ) : (
                stats.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() =>
                      setSelectedTool(
                        selectedTool === tool.name ? null : tool.name,
                      )
                    }
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selectedTool === tool.name
                        ? "bg-slate-800 border-blue-500"
                        : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <p className="font-semibold text-sm mb-2">{tool.name}</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>Calls: {tool.totalCalls}</p>
                      <p className="text-green-400">
                        Success: {tool.successCount}
                      </p>
                      <p className="text-red-400">
                        Failed: {tool.failureCount}
                      </p>
                      <p>Avg Duration: {tool.averageDuration.toFixed(0)}ms</p>
                      <div className="mt-2">
                        <div className="h-2 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${tool.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Execution List */}
            <div className="lg:col-span-4">
              <h2 className="text-lg font-semibold mb-4">
                Executions {selectedTool && `(${selectedTool})`}
              </h2>
              <div className="space-y-3">
                {filteredExecutions.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 text-center text-gray-400 text-sm">
                    No executions found
                    {selectedTool ? ` for ${selectedTool}` : ""}
                  </div>
                ) : (
                  filteredExecutions.map((exec) => (
                    <button
                      key={exec.id}
                      onClick={() => setSelectedExecution(exec)}
                      className={`w-full text-left p-4 rounded-lg border transition ${
                        selectedExecution?.id === exec.id
                          ? "bg-slate-800 border-blue-500"
                          : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {exec.toolName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(exec.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded border text-xs font-semibold ${statusColor[exec.status]}`}
                        >
                          {exec.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        <p>Input: {exec.input.slice(0, 80)}...</p>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>⏱️ {exec.duration}ms</span>
                        <span>🤖 {exec.agentType}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-6 lg:sticky lg:top-8 h-fit bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              {selectedExecution ? (
                <>
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">
                    Tool Execution Details
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Tool Name
                      </p>
                      <p className="font-semibold">
                        {selectedExecution.toolName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Duration
                      </p>
                      <p className="font-semibold">
                        {selectedExecution.duration}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Agent Type
                      </p>
                      <p className="font-semibold">
                        {selectedExecution.agentType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Status
                      </p>
                      <div
                        className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${statusColor[selectedExecution.status]}`}
                      >
                        {selectedExecution.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Input
                      </p>
                      <div className="bg-slate-950 p-4 rounded text-sm font-mono text-gray-300 whitespace-pre-wrap wrap-break-word max-h-96 overflow-auto">
                        {selectedExecution.input}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Output
                      </p>
                      <div className="bg-slate-950 p-4 rounded text-sm font-mono text-gray-300 whitespace-pre-wrap wrap-break-word max-h-96 overflow-auto">
                        {selectedExecution.output}
                      </div>
                    </div>
                  </div>

                  {selectedExecution.error && (
                    <div className="mt-6">
                      <p className="text-xs text-red-500 uppercase mb-2">
                        Error
                      </p>
                      <div className="bg-red-950/30 p-4 rounded text-sm font-mono text-red-300 border border-red-500/30">
                        {selectedExecution.error}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">
                    Select an execution to preview details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
