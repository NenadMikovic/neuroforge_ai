/**
 * Tool Configuration Service - Manages admin settings and statistics
 */

import { prisma } from "@/lib/db/service";
import type {
  AdminToolConfig,
  ToolConfiguration,
  ToolUsageStats,
  ToolName,
} from "./types";

class ToolConfigService {
  private configCache: AdminToolConfig | null = null;
  private cacheExpiry: number = 0;
  private cacheTtl: number = 60000; // 1 minute

  /**
   * Get admin configuration
   */
  async getAdminConfig(): Promise<AdminToolConfig> {
    // Check cache
    if (this.configCache && this.cacheExpiry > Date.now()) {
      return this.configCache;
    }

    try {
      // Get from database
      const stored = await (prisma as any).toolConfiguration?.findFirst();

      if (!stored) {
        // Create default config
        return await this.createDefaultConfig();
      }

      // Parse stored config
      const config: AdminToolConfig = {
        globalEnabled: stored.globalEnabled,
        tools: JSON.parse(stored.toolSettings),
        logging: JSON.parse(stored.loggingConfig),
        security: JSON.parse(stored.securityConfig),
      };

      // Cache it
      this.configCache = config;
      this.cacheExpiry = Date.now() + this.cacheTtl;

      return config;
    } catch (error) {
      console.error("[ToolConfigService] Error loading config:", error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Update admin configuration
   */
  async updateConfig(
    updates: Partial<AdminToolConfig>,
  ): Promise<AdminToolConfig> {
    try {
      // Get current config
      const current = await this.getAdminConfig();

      // Merge updates
      const updated: AdminToolConfig = {
        globalEnabled: updates.globalEnabled ?? current.globalEnabled,
        tools: { ...current.tools, ...(updates.tools || {}) },
        logging: { ...current.logging, ...(updates.logging || {}) },
        security: { ...current.security, ...(updates.security || {}) },
      };

      // Save to database
      const existing = await (prisma as any).toolConfiguration?.findFirst();

      if (existing) {
        await (prisma as any).toolConfiguration?.update({
          where: { id: existing.id },
          data: {
            globalEnabled: updated.globalEnabled,
            toolSettings: JSON.stringify(updated.tools),
            loggingConfig: JSON.stringify(updated.logging),
            securityConfig: JSON.stringify(updated.security),
          },
        });
      } else {
        await (prisma as any).toolConfiguration?.create({
          data: {
            globalEnabled: updated.globalEnabled,
            toolSettings: JSON.stringify(updated.tools),
            loggingConfig: JSON.stringify(updated.logging),
            securityConfig: JSON.stringify(updated.security),
          },
        });
      }

      // Invalidate cache
      this.configCache = updated;
      this.cacheExpiry = Date.now() + this.cacheTtl;

      return updated;
    } catch (error) {
      console.error("[ToolConfigService] Error updating config:", error);
      throw error;
    }
  }

  /**
   * Enable/disable a specific tool
   */
  async setToolEnabled(toolName: ToolName, enabled: boolean): Promise<void> {
    const config = await this.getAdminConfig();

    if (!config.tools[toolName]) {
      config.tools[toolName] = { enabled };
    } else {
      config.tools[toolName]!.enabled = enabled;
    }

    await this.updateConfig(config);
  }

  /**
   * Enable/disable all tools
   */
  async setGlobalEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ globalEnabled: enabled });
  }

  /**
   * Get usage statistics for all tools
   */
  async getStatistics(): Promise<Record<ToolName, ToolUsageStats>> {
    const stats: Record<string, any> = {};

    const toolNames: ToolName[] = [
      "sql_query",
      "python_exec",
      "file_search",
      "system_metrics",
    ];

    for (const toolName of toolNames) {
      try {
        const logs = await (prisma as any).toolExecutionLog?.findMany({
          where: { toolName },
        });

        const successful = logs.filter((l: any) => l.success).length;
        const failed = logs.filter((l: any) => !l.success).length;
        const cached = logs.filter((l: any) => l.cacheHit).length;

        const executionTimes = logs
          .map((l: any) => l.executionTime)
          .sort((a: number, b: number) => a - b);
        const avgTime =
          executionTimes.length > 0
            ? executionTimes.reduce((a: number, b: number) => a + b, 0) /
              executionTimes.length
            : 0;

        const totalData = logs.reduce(
          (sum: number, log: any) => sum + log.resultSize,
          0,
        );

        stats[toolName] = {
          toolName,
          totalCalls: logs.length,
          successfulCalls: successful,
          failedCalls: failed,
          averageExecutionTime: Math.round(avgTime),
          minExecutionTime: executionTimes.length > 0 ? executionTimes[0] : 0,
          maxExecutionTime:
            executionTimes.length > 0
              ? executionTimes[executionTimes.length - 1]
              : 0,
          cacheHitRate:
            logs.length > 0 ? Math.round((cached / logs.length) * 100) : 0,
          totalDataProcessed: totalData,
          lastUsed:
            logs.length > 0
              ? Math.max(...logs.map((l: any) => l.createdAt.getTime()))
              : 0,
        };
      } catch (error) {
        console.error(
          `[ToolConfigService] Error getting stats for ${toolName}:`,
          error,
        );
      }
    }

    return stats;
  }

  /**
   * Get statistics for a specific tool
   */
  async getToolStatistics(toolName: ToolName): Promise<ToolUsageStats | null> {
    try {
      const logs = await (prisma as any).toolExecutionLog?.findMany({
        where: { toolName },
      });

      if (logs.length === 0) {
        return null;
      }

      const successful = logs.filter((l: any) => l.success).length;
      const failed = logs.filter((l: any) => !l.success).length;
      const cached = logs.filter((l: any) => l.cacheHit).length;

      const executionTimes = logs
        .map((l: any) => l.executionTime)
        .sort((a: number, b: number) => a - b);
      const avgTime =
        executionTimes.reduce((a: number, b: number) => a + b, 0) /
        executionTimes.length;

      const totalData = logs.reduce(
        (sum: number, log: any) => sum + log.resultSize,
        0,
      );

      return {
        toolName,
        totalCalls: logs.length,
        successfulCalls: successful,
        failedCalls: failed,
        averageExecutionTime: Math.round(avgTime),
        minExecutionTime: executionTimes[0],
        maxExecutionTime: executionTimes[executionTimes.length - 1],
        cacheHitRate: Math.round((cached / logs.length) * 100),
        totalDataProcessed: totalData,
        lastUsed: Math.max(...logs.map((l: any) => l.createdAt.getTime())),
      };
    } catch (error) {
      console.error(
        `[ToolConfigService] Error getting stats for ${toolName}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    try {
      const result = await (prisma as any).toolExecutionLog?.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error("[ToolConfigService] Error clearing logs:", error);
      return 0;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AdminToolConfig {
    return {
      globalEnabled: true,
      tools: {
        sql_query: {
          enabled: true,
          rateLimit: {
            callsPerMinute: 60,
            callsPerHour: 1000,
          },
          timeout: 30000,
          cacheTtl: 300,
          restrictions: {
            maxOutputSize: 1024 * 1024,
          },
        },
        python_exec: {
          enabled: true,
          rateLimit: {
            callsPerMinute: 30,
            callsPerHour: 500,
          },
          timeout: 60000,
          cacheTtl: 0, // Don't cache Python execution
          restrictions: {
            maxOutputSize: 5 * 1024 * 1024,
          },
        },
        file_search: {
          enabled: true,
          rateLimit: {
            callsPerMinute: 60,
            callsPerHour: 1000,
          },
          timeout: 15000,
          cacheTtl: 600,
          restrictions: {
            maxOutputSize: 500 * 1024,
          },
        },
        system_metrics: {
          enabled: true,
          rateLimit: {
            callsPerMinute: 120,
            callsPerHour: 5000,
          },
          timeout: 5000,
          cacheTtl: 60,
          restrictions: {
            maxOutputSize: 100 * 1024,
          },
        },
      },
      logging: {
        enabled: true,
        logLevel: "info",
        logToDatabase: true,
        logResultsSize: true,
      },
      security: {
        enableInputValidation: true,
        enableOutputSanitization: true,
        auditAllCalls: true,
        rateLimitPerUser: false,
      },
    };
  }

  /**
   * Create default config in database
   */
  private async createDefaultConfig(): Promise<AdminToolConfig> {
    const defaultConfig = this.getDefaultConfig();

    try {
      await (prisma as any).toolConfiguration?.create({
        data: {
          globalEnabled: defaultConfig.globalEnabled,
          toolSettings: JSON.stringify(defaultConfig.tools),
          loggingConfig: JSON.stringify(defaultConfig.logging),
          securityConfig: JSON.stringify(defaultConfig.security),
        },
      });
    } catch (error) {
      console.error(
        "[ToolConfigService] Error creating default config:",
        error,
      );
    }

    return defaultConfig;
  }
}

// Singleton instance
let serviceInstance: ToolConfigService | null = null;

export function getToolConfigService(): ToolConfigService {
  if (!serviceInstance) {
    serviceInstance = new ToolConfigService();
  }
  return serviceInstance;
}

export const toolConfigService = getToolConfigService();
