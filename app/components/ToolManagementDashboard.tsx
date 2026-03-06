/**
 * Tool Management Dashboard Component
 * Admin panel for managing tools, viewing statistics, and configuring settings
 */

"use client";

import React, { useState, useEffect } from "react";
import type { AdminToolConfig, ToolUsageStats } from "@/lib/tools/types";

interface ToolStats {
  [key: string]: ToolUsageStats;
}

interface ToolStatusAlert {
  type: "success" | "error" | "info";
  message: string;
}

export default function ToolManagementDashboard() {
  const [config, setConfig] = useState<AdminToolConfig | null>(null);
  const [stats, setStats] = useState<ToolStats>({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<ToolStatusAlert | null>(null);
  const [collapsedTools, setCollapsedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load configuration
      const configRes = await fetch("/api/tools/config", {
        headers: { authorization: "Bearer admin" },
      });

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
      }

      // Load statistics
      const statsRes = await fetch("/api/tools/stats", {
        headers: { authorization: "Bearer admin" },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || {});
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load tool data:", error);
      setAlert({
        type: "error",
        message: "Failed to load tool configuration and statistics",
      });
      setLoading(false);
    }
  };

  const toggleGlobal = async () => {
    if (!config) return;

    try {
      const response = await fetch("/api/tools/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer admin",
        },
        body: JSON.stringify({
          global: true,
          enabled: !config.globalEnabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
        setAlert({ type: "success", message: data.message });
      } else {
        setAlert({
          type: "error",
          message: "Failed to toggle global setting",
        });
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: "Error toggling global setting",
      });
    }
  };

  const toggleTool = async (toolName: string) => {
    const tools = config?.tools as Record<string, any>;
    if (!tools?.[toolName]) return;

    try {
      const currentEnabled = tools?.[toolName]?.enabled;

      const response = await fetch("/api/tools/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer admin",
        },
        body: JSON.stringify({
          toolName,
          enabled: !currentEnabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
        setAlert({ type: "success", message: data.message });
      } else {
        setAlert({
          type: "error",
          message: `Failed to toggle ${toolName}`,
        });
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: `Error toggling ${toolName}`,
      });
    }
  };

  const toolDescriptions: Record<string, string> = {
    sql_query: "Execute read-only SQL queries against the database",
    python_exec: "Run sandboxed Python code for data analysis",
    file_search: "Search for files within permitted directories",
    system_metrics: "Retrieve CPU, memory, and disk metrics",
  };

  const toolColors: Record<string, string> = {
    sql_query: "bg-blue-500/10 border-blue-500/50",
    python_exec: "bg-purple-500/10 border-purple-500/50",
    file_search: "bg-green-500/10 border-green-500/50",
    system_metrics: "bg-orange-500/10 border-orange-500/50",
  };

  const toolIconBg: Record<string, string> = {
    sql_query: "bg-blue-500/20 text-blue-300",
    python_exec: "bg-purple-500/20 text-purple-300",
    file_search: "bg-green-500/20 text-green-300",
    system_metrics: "bg-orange-500/20 text-orange-300",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tool configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Tool Management Center
          </h1>
          <p className="text-gray-400">
            Monitor and manage LLM tool execution, configure settings, and view
            usage statistics
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              alert.type === "success"
                ? "bg-green-500/10 border-green-500/50 text-green-300"
                : alert.type === "error"
                  ? "bg-red-500/10 border-red-500/50 text-red-300"
                  : "bg-blue-500/10 border-blue-500/50 text-blue-300"
            }`}
          >
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        {/* Global Control */}
        {config && (
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Global Tool Access
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {config.globalEnabled
                    ? "Tools are currently enabled"
                    : "Tools are currently disabled"}
                </p>
              </div>
              <button
                onClick={toggleGlobal}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  config.globalEnabled
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    config.globalEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Tool Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-100">
            Available Tools
          </h2>

          {config &&
            Object.entries(config.tools).map(([toolName, toolConfig]) => {
              const toolStat = stats[toolName];
              const isCollapsed = collapsedTools.has(toolName);

              return (
                <div
                  key={toolName}
                  className={`border rounded-lg transition-colors ${toolColors[toolName as string] || "bg-slate-900/50 border-slate-700"}`}
                >
                  {/* Tool Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`p-3 rounded-lg text-lg font-semibold ${toolIconBg[toolName as string]}`}
                        >
                          {toolName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-100 capitalize">
                            {toolName.replace("_", " ")}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {toolDescriptions[toolName as string]}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleTool(toolName)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ml-4 ${
                          toolConfig?.enabled
                            ? "bg-green-600 hover:bg-green-500"
                            : "bg-slate-700 hover:bg-slate-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            toolConfig?.enabled
                              ? "translate-x-7"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Configuration Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {toolConfig?.timeout && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Timeout
                          </p>
                          <p className="text-sm font-semibold text-slate-100">
                            {toolConfig.timeout / 1000}s
                          </p>
                        </div>
                      )}

                      {toolConfig?.cacheTtl && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Cache TTL
                          </p>
                          <p className="text-sm font-semibold text-slate-100">
                            {toolConfig.cacheTtl}s
                          </p>
                        </div>
                      )}

                      {toolConfig?.rateLimit && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Rate Limit
                          </p>
                          <p className="text-sm font-semibold text-slate-100">
                            {toolConfig.rateLimit.callsPerMinute}/min
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Expand/Collapse */}
                    {toolStat && (
                      <button
                        onClick={() => {
                          setCollapsedTools(
                            isCollapsed
                              ? new Set(
                                  [...collapsedTools].filter(
                                    (t) => t !== toolName,
                                  ),
                                )
                              : new Set([...collapsedTools, toolName]),
                          );
                        }}
                        className="text-sm font-medium text-blue-400 hover:text-blue-300"
                      >
                        {isCollapsed ? "Show" : "Hide"} Statistics
                      </button>
                    )}
                  </div>

                  {/* Statistics */}
                  {!isCollapsed && toolStat && (
                    <div className="border-t border-slate-700 px-6 py-4 bg-slate-900/30">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Total Calls
                          </p>
                          <p className="text-2xl font-bold text-slate-100">
                            {toolStat.totalCalls}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Success Rate
                          </p>
                          <p className="text-2xl font-bold text-green-400">
                            {toolStat.totalCalls > 0
                              ? Math.round(
                                  (toolStat.successfulCalls /
                                    toolStat.totalCalls) *
                                    100,
                                )
                              : 0}
                            %
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Avg Time
                          </p>
                          <p className="text-2xl font-bold text-slate-100">
                            {toolStat.averageExecutionTime}ms
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Cache Hits
                          </p>
                          <p className="text-2xl font-bold text-green-400">
                            {toolStat.cacheHitRate}%
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Failed
                          </p>
                          <p className="text-2xl font-bold text-red-400">
                            {toolStat.failedCalls}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Data Processed
                          </p>
                          <p className="text-2xl font-bold text-slate-100">
                            {(toolStat.totalDataProcessed / 1024).toFixed(1)}KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Configuration Details */}
        <div className="mt-8 bg-slate-900/50 rounded-lg shadow-sm border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            System Configuration
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Logging */}
            <div>
              <h3 className="text-sm font-medium text-slate-100 mb-3">
                Logging
              </h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  {config?.logging.enabled ? (
                    <span className="text-green-400">Enabled</span>
                  ) : (
                    <span className="text-red-400">Disabled</span>
                  )}
                </p>
                <p>
                  <span className="font-medium">Level:</span>{" "}
                  {config?.logging.logLevel}
                </p>
                <p>
                  <span className="font-medium">Database:</span>{" "}
                  {config?.logging.logToDatabase ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Security */}
            <div>
              <h3 className="text-sm font-medium text-slate-100 mb-3">
                Security
              </h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <span className="font-medium">Input Validation:</span>{" "}
                  {config?.security.enableInputValidation ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-medium">Output Sanitization:</span>{" "}
                  {config?.security.enableOutputSanitization ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-medium">Audit:</span>{" "}
                  {config?.security.auditAllCalls ? "All Calls" : "Disabled"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
