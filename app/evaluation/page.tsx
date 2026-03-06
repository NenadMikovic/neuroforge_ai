/**
 * Evaluation Dashboard
 * /evaluation - View system metrics and performance analytics
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Metrics {
  totalTokens: number;
  totalRequests: number;
  averageLatency: number;
  averageTokensPerRequest: number;
  errorRate: number;
  retrievalHitRate: number;
  agentRoutingDistribution: Record<string, number>;
  toolUsageFrequency: Record<string, number>;
  modelUsageDistribution: Record<string, number>;
  conversationCount: number;
}

export default function EvaluationDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/evaluation/metrics?days=${days}`, {
        headers: { Authorization: "Bearer admin" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || `HTTP ${response.status}`,
        );
      }

      const data = await response.json();
      setMetrics(data.data.metrics);
      setErrorLogs(data.data.errorLogs || []);
      setSecurityIncidents(data.data.securityIncidents || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load metrics";
      console.error("Error loading metrics:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Failed to Load Metrics
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => loadMetrics()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Evaluation Dashboard</h1>
              <p className="text-gray-400">
                System metrics and performance analytics
              </p>
            </div>
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8 flex gap-4">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 border border-slate-700 text-gray-300 hover:bg-slate-800"
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>

        {/* Key Metrics Grid */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Tokens */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Total Tokens</p>
                <p className="text-3xl font-bold">
                  {metrics.totalTokens.toLocaleString()}
                </p>
              </div>

              {/* Average Latency */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Avg Latency</p>
                <p className="text-3xl font-bold">{metrics.averageLatency}ms</p>
              </div>

              {/* Error Rate */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Error Rate</p>
                <p className="text-3xl font-bold">{metrics.errorRate}%</p>
              </div>

              {/* Retrieval Hit Rate */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Retrieval Hit Rate</p>
                <p className="text-3xl font-bold">
                  {metrics.retrievalHitRate}%
                </p>
              </div>

              {/* Total Requests */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Total Requests</p>
                <p className="text-3xl font-bold">
                  {metrics.totalRequests.toLocaleString()}
                </p>
              </div>

              {/* Avg Tokens/Request */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Avg Tokens/Request</p>
                <p className="text-3xl font-bold">
                  {metrics.averageTokensPerRequest}
                </p>
              </div>

              {/* Conversations */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Conversations</p>
                <p className="text-3xl font-bold">
                  {metrics.conversationCount}
                </p>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Agent Routing Distribution */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Agent Routing Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.agentRoutingDistribution).map(
                    ([agent, count]) => (
                      <div key={agent}>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 text-sm">{agent}</span>
                          <span className="text-gray-400 text-sm">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    ...Object.values(
                                      metrics.agentRoutingDistribution,
                                    ),
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Tool Usage Frequency */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Tool Usage Frequency
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.toolUsageFrequency).map(
                    ([tool, count]) => (
                      <div key={tool}>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 text-sm">{tool}</span>
                          <span className="text-gray-400 text-sm">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    ...Object.values(
                                      metrics.toolUsageFrequency,
                                    ),
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Model Usage Distribution */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Model Usage</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.modelUsageDistribution).map(
                    ([model, count]) => (
                      <div key={model}>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 text-sm">{model}</span>
                          <span className="text-gray-400 text-sm">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    ...Object.values(
                                      metrics.modelUsageDistribution,
                                    ),
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error Logs */}
        {errorLogs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Recent Errors</h2>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Tool
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.slice(0, 10).map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-slate-600/30 hover:bg-slate-700/20"
                    >
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-red-400">
                        {log.errorType || "Unknown"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {log.agentType || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {log.toolUsed || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Security Incidents */}
        {securityIncidents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Security Incidents</h2>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Threat Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {securityIncidents.slice(0, 10).map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-t border-slate-600/30 hover:bg-slate-700/20"
                    >
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {new Date(incident.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {incident.threatType}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.severity === "critical"
                              ? "bg-red-500/20 text-red-300"
                              : incident.severity === "high"
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {incident.action_taken}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
