"use client";

import { useEffect, useState } from "react";
import type { AgentType } from "@/lib/agents/types";

interface AgentMetric {
  agentType: AgentType;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  averageTokenUsage: number;
  routingFrequency: number;
  errorRate: number;
  successRate: number;
  lastExecution: string;
}

interface MetricsSummary {
  summary: {
    totalAgentExecutions: number;
    totalErrors: number;
    avgExecutionTime: number;
    overallSuccessRate: number;
    executionsLast24h: number;
    executionsLastHour: number;
    totalRoutingDecisions: number;
  };
  byAgent: Record<string, any>;
}

interface RoutingStats {
  intentFrequency: Record<string, number>;
  agentFrequency: Record<string, number>;
  averageConfidence: number;
}

export default function AgentDashboard() {
  const [metrics, setMetrics] = useState<AgentMetric[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [routing, setRouting] = useState<RoutingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "all">("24h");

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch performance metrics
        const metricsRes = await fetch(
          "/api/agents/metrics?metric=performance",
        );
        if (!metricsRes.ok) throw new Error("Failed to fetch metrics");
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);

        // Fetch summary
        const summaryRes = await fetch("/api/agents/metrics?metric=summary");
        if (!summaryRes.ok) throw new Error("Failed to fetch summary");
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        // Fetch routing stats
        const routingRes = await fetch(
          `/api/agents/metrics?metric=routing&timeRange=${timeRange}`,
        );
        if (!routingRes.ok) throw new Error("Failed to fetch routing stats");
        const routingData = await routingRes.json();
        setRouting(routingData);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 60 seconds (1 minute)
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-2xl">Loading agent metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="bg-red-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Agent Performance Dashboard
          </h1>
          <p className="text-gray-400">
            Multi-Agent Orchestration System Metrics
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-4">
          {(["24h", "7d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Last{" "}
              {range === "24h"
                ? "24 Hours"
                : range === "7d"
                  ? "7 Days"
                  : "All Time"}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title="Total Executions"
              value={summary.summary.totalAgentExecutions}
              subtitle={`${summary.summary.executionsLast24h} in last 24h`}
              color="blue"
            />
            <SummaryCard
              title="Success Rate"
              value={`${summary.summary.overallSuccessRate.toFixed(2)}%`}
              subtitle={`${summary.summary.totalErrors} total errors`}
              color="green"
            />
            <SummaryCard
              title="Avg Response Time"
              value={`${summary.summary.avgExecutionTime}ms`}
              subtitle="Per execution"
              color="purple"
            />
            <SummaryCard
              title="Routing Decisions"
              value={summary.summary.totalRoutingDecisions}
              subtitle={`${routing?.averageConfidence.toFixed(1) || 0}% avg confidence`}
              color="orange"
            />
          </div>
        )}

        {/* Agent Performance Table */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Agent Performance Metrics</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold">Agent</th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Executions
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Success Rate
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Avg Response Time
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Error Rate
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Routing Frequency
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.length > 0 ? (
                  metrics.map((metric) => (
                    <tr
                      key={metric.agentType}
                      className="border-b border-gray-700 hover:bg-gray-700 transition"
                    >
                      <td className="py-3 px-4 font-semibold capitalize">
                        {metric.agentType}
                      </td>
                      <td className="text-center py-3 px-4">
                        {metric.totalExecutions}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            metric.successRate >= 90
                              ? "bg-green-900 text-green-200"
                              : metric.successRate >= 70
                                ? "bg-yellow-900 text-yellow-200"
                                : "bg-red-900 text-red-200"
                          }`}
                        >
                          {metric.successRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {metric.averageExecutionTime.toFixed(2)}ms
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            metric.errorRate < 5
                              ? "bg-green-900 text-green-200"
                              : metric.errorRate < 10
                                ? "bg-yellow-900 text-yellow-200"
                                : "bg-red-900 text-red-200"
                          }`}
                        >
                          {metric.errorRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {metric.routingFrequency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No metric data available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Routing Analysis */}
        {routing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Intent Distribution */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Intent Distribution</h3>
              <div className="space-y-3">
                {Object.entries(routing.intentFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([intent, count]) => {
                    const total = Object.values(routing.intentFrequency).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    const percent = (count / total) * 100;
                    return (
                      <div key={intent}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm capitalize">{intent}</span>
                          <span className="text-sm text-gray-400">
                            {count} ({percent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Agent Selection Distribution */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">
                Agent Selection Frequency
              </h3>
              <div className="space-y-3">
                {Object.entries(routing.agentFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .map(([agent, count]) => {
                    const total = Object.values(routing.agentFrequency).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    const percent = (count / total) * 100;
                    return (
                      <div key={agent}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm capitalize">
                            {agent} Agent
                          </span>
                          <span className="text-sm text-gray-400">
                            {count} ({percent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Agent Details */}
        {summary && (
          <div className="bg-gray-800 rounded-lg p-6 mt-8">
            <h3 className="text-xl font-bold mb-4">Agent Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(summary.byAgent).map(([agentType, stats]) => (
                <div key={agentType} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold capitalize mb-3">
                    {agentType} Agent
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-400">Executions:</span>{" "}
                      <span className="text-white">{stats.executions}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Success Rate:</span>{" "}
                      <span className="text-white">{stats.successRate}%</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Avg Time:</span>{" "}
                      <span className="text-white">{stats.avgTime}ms</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Routing Count:</span>{" "}
                      <span className="text-white">
                        {stats.routingFrequency}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Dashboard updates automatically every minute</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Summary Card Component
 */
function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-900/20",
    green: "border-green-500 bg-green-900/20",
    purple: "border-purple-500 bg-purple-900/20",
    orange: "border-orange-500 bg-orange-900/20",
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} rounded-lg p-6`}>
      <p className="text-gray-400 text-sm font-semibold mb-2">{title}</p>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-gray-500 text-xs">{subtitle}</p>
    </div>
  );
}
