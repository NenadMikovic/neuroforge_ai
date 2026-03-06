"use client";

import React, { useState, useEffect } from "react";
import { showErrorToast } from "@/lib/utils/toast";

interface DocumentMetric {
  id: string;
  name: string;
  retrievalCount: number;
}

interface RetrievalMetricsProps {
  userId: string;
}

export function RetrievalMetrics({ userId }: RetrievalMetricsProps) {
  const [metrics, setMetrics] = useState<DocumentMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRetrievals, setTotalRetrievals] = useState(0);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/retrieval/metrics?userId=${userId}&type=top&limit=5`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const result = await response.json();
      setMetrics(result.metrics || []);

      if (result.metrics) {
        const total = result.metrics.reduce(
          (sum: number, m: DocumentMetric) => sum + m.retrievalCount,
          0,
        );
        setTotalRetrievals(total);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && metrics.length === 0) {
    return (
      <div className="text-xs text-slate-500 p-4 text-center">
        Loading metrics...
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-xs text-slate-500 p-4 text-center">
        No retrieval activity yet
      </div>
    );
  }

  const maxRetrievals = Math.max(...metrics.map((m) => m.retrievalCount), 1);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-300 px-2">
        Top Documents by Usage ({totalRetrievals} total)
      </div>

      {metrics.map((metric) => (
        <div key={metric.id} className="space-y-1">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-300 truncate flex-1">
              {metric.name}
            </span>
            <span className="text-xs font-medium text-cyan-400 ml-2">
              {metric.retrievalCount}
            </span>
          </div>
          <div className="px-2">
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-linear-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                style={{
                  width: `${(metric.retrievalCount / maxRetrievals) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RetrievalMetrics;
