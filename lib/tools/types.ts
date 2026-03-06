/**
 * Tool System Types and Interfaces
 */

export type ToolName =
  | "sql_query"
  | "python_exec"
  | "file_search"
  | "system_metrics";

export enum ToolType {
  SQL_QUERY = "sql_query",
  PYTHON_EXEC = "python_exec",
  FILE_SEARCH = "file_search",
  SYSTEM_METRICS = "system_metrics",
}

// Tool Call Request from LLM
export interface ToolCall {
  type: "tool_call";
  tool: ToolName;
  id: string;
  params: Record<string, unknown>;
}

// Tool Execution Request
export interface ToolRequest {
  toolCall: ToolCall;
  conversationId: string;
  userId: string;
  timestamp: number;
}

// Tool Execution Result
export interface ToolResult {
  toolCallId: string;
  tool: ToolName;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  metadata?: {
    rowCount?: number;
    outputLength?: number;
    [key: string]: unknown;
  };
}

// Tool Definition for LLM Context
export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  restrictions?: {
    maxDuration?: number;
    maxOutputSize?: number;
    allowedPatterns?: RegExp[];
    forbiddenPatterns?: RegExp[];
  };
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: (string | number)[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

// Tool Execution Log
export interface ToolExecutionLog {
  id: string;
  conversationId: string;
  userId: string;
  toolName: ToolName;
  toolCallId: string;
  paramsHash: string;
  executionTime: number;
  resultHash: string;
  success: boolean;
  errorMessage?: string;
  resultSize: number;
  cacheHit: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Tool Usage Statistics
export interface ToolUsageStats {
  toolName: ToolName;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  cacheHitRate: number;
  totalDataProcessed: number;
  lastUsed: number;
}

// Tool Configuration
export interface ToolConfiguration {
  enabled: boolean;
  rateLimit?: {
    callsPerMinute: number;
    callsPerHour: number;
  };
  timeout?: number; // ms
  cacheResults?: boolean;
  cacheTtl?: number; // seconds
  restrictions?: {
    maxOutputSize?: number;
    allowedPatterns?: string[];
    forbiddenPatterns?: string[];
  };
}

// Admin Configuration
export interface AdminToolConfig {
  globalEnabled: boolean;
  tools: {
    [key in ToolName]?: ToolConfiguration;
  };
  logging: {
    enabled: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    logToDatabase: boolean;
    logResultsSize: boolean;
  };
  security: {
    enableInputValidation: boolean;
    enableOutputSanitization: boolean;
    auditAllCalls: boolean;
    rateLimitPerUser: boolean;
  };
}

// Tool Execution Context
export interface ToolContext {
  conversationId: string;
  userId: string;
  sessionId?: string;
  userRole?: "user" | "admin" | "moderator";
  timestamp: number;
}

// LLM Tool Call Output Format
export interface LLMToolOutput {
  type: "tool_call" | "text" | "mixed";
  toolCalls?: ToolCall[];
  textContent?: string;
}
