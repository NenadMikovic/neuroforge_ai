/**
 * Latency Tracker Service
 * Tracks execution times and performance metrics
 */

interface LatencyMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  metadata?: Record<string, any>;
}

export class LatencyTracker {
  private activeMetrics: Map<string, LatencyMetrics> = new Map();
  private completedMetrics: LatencyMetrics[] = [];

  /**
   * Start tracking latency for an operation
   */
  start(
    operationId: string,
    operation: string,
    metadata?: Record<string, any>,
  ): void {
    this.activeMetrics.set(operationId, {
      startTime: performance.now(),
      operation,
      metadata,
    });
  }

  /**
   * End tracking and get latency
   */
  end(operationId: string): number | null {
    const metric = this.activeMetrics.get(operationId);

    if (!metric) {
      console.warn(`[LatencyTracker] Operation ${operationId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = Math.round(endTime - metric.startTime);

    // Update metric
    metric.endTime = endTime;
    metric.duration = duration;

    // Store in completed
    this.completedMetrics.push(metric);

    // Remove from active
    this.activeMetrics.delete(operationId);

    return duration;
  }

  /**
   * Get average latency across all completed operations
   */
  getAverageLatency(): number {
    if (this.completedMetrics.length === 0) return 0;

    const total = this.completedMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );
    return Math.round(total / this.completedMetrics.length);
  }

  /**
   * Get latency by operation type
   */
  getLatencyByOperation(operation: string): number {
    const metrics = this.completedMetrics.filter(
      (m) => m.operation === operation,
    );

    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return Math.round(total / metrics.length);
  }

  /**
   * Get all completed metrics
   */
  getMetrics(): LatencyMetrics[] {
    return [...this.completedMetrics];
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.activeMetrics.clear();
    this.completedMetrics = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalOperations: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    byOperation: Record<string, { count: number; avg: number }>;
  } {
    if (this.completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        byOperation: {},
      };
    }

    const durations = this.completedMetrics.map((m) => m.duration || 0);
    const byOp: Record<string, { count: number; total: number }> = {};

    for (const metric of this.completedMetrics) {
      if (!byOp[metric.operation]) {
        byOp[metric.operation] = { count: 0, total: 0 };
      }
      byOp[metric.operation].count++;
      byOp[metric.operation].total += metric.duration || 0;
    }

    const byOperation: Record<string, { count: number; avg: number }> = {};
    for (const [op, stats] of Object.entries(byOp)) {
      byOperation[op] = {
        count: stats.count,
        avg: Math.round(stats.total / stats.count),
      };
    }

    return {
      totalOperations: this.completedMetrics.length,
      averageLatency: this.getAverageLatency(),
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      byOperation,
    };
  }
}

// Singleton instance
let trackerInstance: LatencyTracker | null = null;

export function getLatencyTracker(): LatencyTracker {
  if (!trackerInstance) {
    trackerInstance = new LatencyTracker();
  }
  return trackerInstance;
}
