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
  const [selectedExecution, setSelectedExecution] =
    useState<ToolExecution | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    // Mock tool execution data (no real API endpoint in admin context)
    const mockExecutions: ToolExecution[] = [
      {
        id: "1",
        toolName: "web_search",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        duration: 1243,
        status: "success",
        input: "latest AI developments",
        output: "Found 15 relevant articles...",
        agentType: "ResearchAgent",
      },
      {
        id: "2",
        toolName: "calculate",
        timestamp: new Date(Date.now() - 15000).toISOString(),
        duration: 42,
        status: "success",
        input: "5 * 3 + 2",
        output: "17",
        agentType: "ToolAgent",
      },
      {
        id: "3",
        toolName: "summarize_document",
        timestamp: new Date(Date.now() - 45000).toISOString(),
        duration: 2156,
        status: "success",
        input: "document_id_123",
        output: "Document summary: This document discusses...",
        agentType: "ResearchAgent",
      },
    ];

    setExecutions(mockExecutions);

    // Calculate stats
    const toolMap = new Map<string, ToolStats>();
    mockExecutions.forEach((exec) => {
      const existing = toolMap.get(exec.toolName) || {
        name: exec.toolName,
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        successRate: 0,
      };

      existing.totalCalls++;
      if (exec.status === "success") existing.successCount++;
      else existing.failureCount++;
      existing.averageDuration =
        (existing.averageDuration * (existing.totalCalls - 1) + exec.duration) /
        existing.totalCalls;
      existing.successRate =
        (existing.successCount / existing.totalCalls) * 100;

      toolMap.set(exec.toolName, existing);
    });

    setStats(Array.from(toolMap.values()));

    setLoading(false);
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
          <h1 className="text-4xl font-bold mb-2">Tool Explorer</h1>
          <p className="text-gray-400">
            Analyze tool execution history and performance
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading tool data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tool Stats */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold mb-4">Tools</h2>
              {stats.map((tool) => (
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
                    <p className="text-red-400">Failed: {tool.failureCount}</p>
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
              ))}
            </div>

            {/* Execution List */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">
                Executions {selectedTool && `(${selectedTool})`}
              </h2>
              <div className="space-y-3">
                {filteredExecutions.map((exec) => (
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
                        <p className="font-semibold text-sm">{exec.toolName}</p>
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
                ))}
              </div>
            </div>

            {/* Details Panel */}
            {selectedExecution && (
              <div className="lg:col-span-3 bg-slate-900/50 border border-slate-700 rounded-lg p-6">
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
                    <div className="bg-slate-950 p-4 rounded text-sm font-mono text-gray-300">
                      {selectedExecution.input}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">
                      Output
                    </p>
                    <div className="bg-slate-950 p-4 rounded text-sm font-mono text-gray-300">
                      {selectedExecution.output}
                    </div>
                  </div>
                </div>

                {selectedExecution.error && (
                  <div className="mt-6">
                    <p className="text-xs text-red-500 uppercase mb-2">Error</p>
                    <div className="bg-red-950/30 p-4 rounded text-sm font-mono text-red-300 border border-red-500/30">
                      {selectedExecution.error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
