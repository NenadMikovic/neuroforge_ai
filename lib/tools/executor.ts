/**
 * Tool Executor - Core execution engine with validation and security
 */

import crypto from "crypto";
import type {
  ToolCall,
  ToolRequest,
  ToolResult,
  ToolContext,
  ToolExecutionLog,
  AdminToolConfig,
} from "./types";
import { validateToolCall } from "./validators";
import { getToolDefinitions } from "./definitions";
import { SQLQueryTool } from "./sqlQueryTool";
import { PythonExecutionTool } from "./pythonExecutionTool";
import { FileSearchTool } from "./fileSearchTool";
import { SystemMetricsTool } from "./systemMetricsTool";
import { prisma } from "@/lib/db/service";
import { toolConfigService } from "./configService";

interface ToolExecutorConfig {
  enableCaching?: boolean;
  enableLogging?: boolean;
  maxConcurrent?: number;
}

export class ToolExecutor {
  private config: Required<ToolExecutorConfig>;
  private executionCache: Map<string, { result: ToolResult; expires: number }>;
  private concurrentExecutions: number = 0;
  private toolInstances: Map<string, any>;
  private adminConfig: AdminToolConfig | null = null;

  constructor(config: ToolExecutorConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      enableLogging: config.enableLogging ?? true,
      maxConcurrent: config.maxConcurrent ?? 50,
    };

    this.executionCache = new Map();
    this.toolInstances = new Map<string, any>([
      ["sql_query", new SQLQueryTool()],
      ["python_exec", new PythonExecutionTool()],
      ["file_search", new FileSearchTool()],
      ["system_metrics", new SystemMetricsTool()],
    ] as [string, any][]);

    // Load admin config asynchronously
    this.loadAdminConfig();
  }

  /**
   * Ensure admin config is loaded
   */
  private async ensureConfigLoaded(): Promise<void> {
    if (!this.adminConfig) {
      // Wait a bit for the constructor's async load to complete
      for (let i = 0; i < 50; i++) {
        if (this.adminConfig) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      // If still not loaded, load it now
      if (!this.adminConfig) {
        await this.loadAdminConfig();
      }
    }
  }

  /**
   * Load admin configuration
   */
  private async loadAdminConfig(): Promise<void> {
    try {
      this.adminConfig = await toolConfigService.getAdminConfig();
    } catch (error) {
      console.error("[ToolExecutor] Failed to load admin config:", error);
      // Use default config if loading fails
      this.adminConfig = {
        globalEnabled: true,
        tools: {
          sql_query: { enabled: true, timeout: 30000, cacheTtl: 300 },
          python_exec: { enabled: true, timeout: 60000, cacheTtl: 0 },
          file_search: { enabled: true, timeout: 15000, cacheTtl: 600 },
          system_metrics: { enabled: true, timeout: 5000, cacheTtl: 60 },
        } as any,
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
  }

  /**
   * Execute a tool call with full validation and security checks
   */
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const executionId = `${toolCall.tool}-${toolCall.id}-${Date.now()}`;
    const startTime = performance.now();

    try {
      // Ensure admin config is loaded
      await this.ensureConfigLoaded();

      // Step 1: Check if tools are enabled
      if (!this.adminConfig?.globalEnabled) {
        throw new Error("Tool execution is disabled globally");
      }

      // Step 2: Validate tool call format and schema
      const validation = validateToolCall(toolCall);
      if (!validation.valid) {
        throw new Error(`Invalid tool call: ${validation.errors.join(", ")}`);
      }

      // Step 3: Check tool-specific configuration
      const toolConfig = (this.adminConfig?.tools as Record<string, any>)?.[
        toolCall.tool
      ];
      if (!toolConfig?.enabled) {
        throw new Error(`Tool '${toolCall.tool}' is disabled`);
      }

      // Step 4: Check rate limits
      await this.checkRateLimit(toolCall.tool, context);

      // Step 5: Check cache for identical calls
      const cachedResult = this.getCachedResult(toolCall, context);
      if (cachedResult) {
        console.log(`[ToolExecutor] Cache hit for ${toolCall.tool}`);
        await this.logExecution(
          {
            ...cachedResult,
            metadata: { ...cachedResult.metadata, cacheHit: true },
          },
          context,
        );
        return cachedResult;
      }

      // Step 6: Security validation and input sanitization
      await this.validateSecurity(toolCall, context);

      // Step 7: Execute the tool
      const result = await this.executeTool(toolCall, context);

      // Step 8: Validate and sanitize output
      const sanitizedResult = await this.sanitizeOutput(result, toolCall.tool);

      // Step 9: Cache result if enabled
      if (this.config.enableCaching && toolConfig.cacheTtl) {
        this.setCachedResult(
          toolCall,
          context,
          sanitizedResult,
          toolConfig.cacheTtl,
        );
      }

      // Step 10: Log execution
      const executionTime = performance.now() - startTime;
      await this.logExecution(
        {
          ...sanitizedResult,
          executionTime,
        },
        context,
      );

      return {
        ...sanitizedResult,
        executionTime,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log failed execution
      await this.logExecution(
        {
          toolCallId: toolCall.id,
          tool: toolCall.tool,
          success: false,
          error: errorMessage,
          executionTime,
        },
        context,
      );

      return {
        toolCallId: toolCall.id,
        tool: toolCall.tool,
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Execute the actual tool
   */
  private async executeTool(
    toolCall: ToolCall,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.toolInstances.get(toolCall.tool);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.tool}`);
    }

    return tool.execute(toolCall, context);
  }

  /**
   * Check rate limit for tool usage
   */
  private async checkRateLimit(
    toolName: string,
    context: ToolContext,
  ): Promise<void> {
    const toolConfig = (this.adminConfig?.tools as Record<string, any>)?.[
      toolName
    ];
    if (!toolConfig?.rateLimit) return;

    const key = `ratelimit:${context.userId}:${toolName}`;
    // This is a simplified check - in production, use Redis
    // For now, just log that we checked
    // TODO: Implement actual rate limiting with Redis
  }

  /**
   * Validate security constraints
   */
  private async validateSecurity(
    toolCall: ToolCall,
    context: ToolContext,
  ): Promise<void> {
    if (!this.adminConfig?.security.enableInputValidation) return;

    const definition = getToolDefinitions().find(
      (d: any) => d.name === toolCall.tool,
    );
    if (!definition) return;

    const restrictions = definition.restrictions || {};

    // Check forbidden patterns
    if (restrictions.forbiddenPatterns) {
      const params = JSON.stringify(toolCall.params);
      for (const pattern of restrictions.forbiddenPatterns) {
        if (pattern.test(params)) {
          throw new Error(`Input contains forbidden pattern`);
        }
      }
    }

    // Check allowed patterns
    if (restrictions.allowedPatterns) {
      const params = JSON.stringify(toolCall.params);
      const hasAllowed = restrictions.allowedPatterns.some((p: RegExp) =>
        p.test(params),
      );
      if (!hasAllowed) {
        throw new Error(`Input does not match allowed patterns`);
      }
    }
  }

  /**
   * Sanitize output
   */
  private async sanitizeOutput(
    result: ToolResult,
    toolName: string,
  ): Promise<ToolResult> {
    if (!this.adminConfig?.security.enableOutputSanitization) return result;

    // Sanitize sensitive data
    const sanitized = { ...result };

    // Remove API keys or passwords from output
    if (sanitized.result && typeof sanitized.result === "object") {
      const resultStr = JSON.stringify(sanitized.result);
      // Remove common password/key patterns
      const cleaned = resultStr
        .replace(
          /password['":][\s]*['"]*([^'"\s,}]+)/gi,
          "password: ***REDACTED***",
        )
        .replace(
          /api[_-]?key['":][\s]*['"]*([^'"\s,}]+)/gi,
          "api_key: ***REDACTED***",
        )
        .replace(/token['":][\s]*['"]*([^'"\s,}]+)/gi, "token: ***REDACTED***")
        .replace(
          /secret['":][\s]*['"]*([^'"\s,}]+)/gi,
          "secret: ***REDACTED***",
        );

      try {
        sanitized.result = JSON.parse(cleaned);
      } catch {
        sanitized.result = cleaned;
      }
    }

    return sanitized;
  }

  /**
   * Get cached result if exists
   */
  private getCachedResult(
    toolCall: ToolCall,
    context: ToolContext,
  ): ToolResult | null {
    if (!this.config.enableCaching) return null;

    const cacheKey = this.getCacheKey(toolCall, context);
    const cached = this.executionCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    if (cached) {
      this.executionCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(
    toolCall: ToolCall,
    context: ToolContext,
    result: ToolResult,
    ttl: number,
  ): void {
    const cacheKey = this.getCacheKey(toolCall, context);
    this.executionCache.set(cacheKey, {
      result,
      expires: Date.now() + ttl * 1000,
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(toolCall: ToolCall, context: ToolContext): string {
    const key = `${toolCall.tool}:${JSON.stringify(toolCall.params)}:${context.userId}`;
    return crypto.createHash("md5").update(key).digest("hex");
  }

  /**
   * Log tool execution
   */
  private async logExecution(
    result: ToolResult,
    context: ToolContext,
  ): Promise<void> {
    if (!this.config.enableLogging) return;

    try {
      const paramsHash = crypto.randomBytes(8).toString("hex"); // Placeholder
      const resultHash = crypto.randomBytes(8).toString("hex"); // Placeholder

      const log: any = {
        conversationId: context.conversationId,
        userId: context.userId,
        toolName: result.tool,
        toolCallId: result.toolCallId,
        paramsHash,
        executionTime: result.executionTime,
        resultHash,
        success: result.success,
        errorMessage: result.error,
        resultSize: result.result ? JSON.stringify(result.result).length : 0,
        cacheHit: result.metadata?.cacheHit ?? false,
        metadata: result.metadata ? JSON.stringify(result.metadata) : null,
      };

      // Log to database
      if (this.adminConfig?.logging.logToDatabase) {
        try {
          await (prisma as any).toolExecutionLog?.create({
            data: {
              ...log,
              id: crypto.randomUUID(),
            } as any,
          });
        } catch (dbError) {
          console.error("[ToolExecutor] Failed to log to database:", dbError);
        }
      }

      // Log to console
      const logLevel = this.adminConfig?.logging.logLevel || "info";
      const shouldLog =
        logLevel === "info" || !result.success || logLevel === "warn";

      if (shouldLog) {
        console.log(`[ToolExecutor:${result.tool}]`, {
          success: result.success,
          executionTime: result.executionTime,
          error: result.error,
          cacheHit: result.metadata?.cacheHit,
        });
      }
    } catch (error) {
      console.error("[ToolExecutor] Logging failed:", error);
    }
  }

  /**
   * Get tool usage statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    try {
      return await toolConfigService.getStatistics();
    } catch (error) {
      console.error("[ToolExecutor] Failed to get statistics:", error);
      return {};
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.executionCache.clear();
    console.log("[ToolExecutor] Cache cleared");
  }

  /**
   * Reload admin configuration
   */
  async reloadConfig(): Promise<void> {
    await this.loadAdminConfig();
    console.log("[ToolExecutor] Configuration reloaded");
  }
}

// Singleton instance
let executorInstance: ToolExecutor | null = null;

export function getToolExecutor(): ToolExecutor {
  if (!executorInstance) {
    executorInstance = new ToolExecutor({
      enableCaching: true,
      enableLogging: true,
      maxConcurrent: 50,
    });
  }
  return executorInstance;
}
