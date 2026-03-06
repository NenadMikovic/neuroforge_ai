/**
 * System Metrics Tool - Retrieve CPU, memory, and disk metrics
 */

import os from "os";
import type { ToolCall, ToolResult, ToolContext } from "./types";

export class SystemMetricsTool {
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const startTime = performance.now();

    try {
      const params = toolCall.params as {
        metrics?: string[];
        detailed?: boolean;
      };

      const {
        metrics = ["cpu", "memory", "disk", "uptime"],
        detailed = false,
      } = params;

      // Validate metrics
      const validMetrics = [
        "cpu",
        "memory",
        "disk",
        "network",
        "processes",
        "uptime",
      ];
      const requestedMetrics = metrics.filter((m: string) =>
        validMetrics.includes(m),
      );

      if (requestedMetrics.length === 0) {
        requestedMetrics.push("cpu", "memory", "uptime");
      }

      // Gather metrics
      const result: Record<string, any> = {};

      for (const metric of requestedMetrics) {
        try {
          switch (metric) {
            case "cpu":
              result.cpu = this.getCPUMetrics(detailed);
              break;
            case "memory":
              result.memory = this.getMemoryMetrics(detailed);
              break;
            case "disk":
              result.disk = await this.getDiskMetrics(detailed);
              break;
            case "uptime":
              result.uptime = this.getUptimeMetrics();
              break;
            case "network":
              result.network = this.getNetworkMetrics();
              break;
            case "processes":
              result.processes = this.getProcessMetrics();
              break;
            default:
              break;
          }
        } catch (error) {
          result[metric] = {
            error: `Failed to retrieve ${metric} metrics`,
          };
        }
      }

      const executionTime = performance.now() - startTime;

      return {
        toolCallId: toolCall.id,
        tool: "system_metrics",
        success: true,
        result,
        executionTime,
        metadata: {
          metricsCount: requestedMetrics.length,
          outputLength: JSON.stringify(result).length,
        },
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        toolCallId: toolCall.id,
        tool: "system_metrics",
        success: false,
        error: `System Metrics Error: ${errorMessage}`,
        executionTime,
      };
    }
  }

  private getCPUMetrics(detailed: boolean) {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    const metrics: any = {
      count: cpus.length,
      loadAverage: {
        one: loadAverage[0],
        five: loadAverage[1],
        fifteen: loadAverage[2],
      },
    };

    if (detailed) {
      metrics.cores = cpus.map((cpu: any) => ({
        model: cpu.model,
        speed: cpu.speed,
      }));
    }

    return metrics;
  }

  private getMemoryMetrics(detailed: boolean) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics: any = {
      total: this.formatBytes(totalMem),
      used: this.formatBytes(usedMem),
      free: this.formatBytes(freeMem),
      percentage: Math.round((usedMem / totalMem) * 100),
    };

    if (detailed) {
      metrics.raw = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
      };
    }

    return metrics;
  }

  private async getDiskMetrics(detailed: boolean) {
    const cwd = process.cwd();

    try {
      const metrics: any = {
        path: cwd,
      };

      if (detailed) {
        metrics.note =
          "Detailed disk metrics require additional tools. Use monitoring services for production.";
      }

      return metrics;
    } catch (error) {
      return {
        error: "Unable to retrieve disk metrics",
      };
    }
  }

  private getUptimeMetrics() {
    const uptime = os.uptime();

    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return {
      seconds: uptime,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
    };
  }

  private getNetworkMetrics() {
    const interfaces = os.networkInterfaces();
    const metrics: any = {};

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        metrics[name] = addrs.map((addr: any) => ({
          family: addr.family,
          address: addr.address,
        }));
      }
    }

    return metrics;
  }

  private getProcessMetrics() {
    return {
      pid: process.pid,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}
