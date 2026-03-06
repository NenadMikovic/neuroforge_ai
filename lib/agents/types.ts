/**
 * Core type definitions for the multi-agent orchestration system
 */

export type AgentType = "planner" | "research" | "tool" | "critic";

export interface AgentPayload {
  conversationId: string;
  userId: string;
  input: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  agentType: AgentType;
  status: "success" | "error";
  output: string;
  data?: Record<string, any>;
  reasoning?: string;
  executionTime: number;
  tokenUsage?: number;
  error?: string;
}

export interface PlannerOutput {
  tasks: Task[];
  thinking: string;
}

export interface Task {
  id: string;
  description: string;
  type: "research" | "tool" | "evaluation";
  priority: "high" | "medium" | "low";
  dependencies?: string[]; // IDs of dependent tasks
}

export interface ResearchOutput {
  sources: Array<{
    documentId: string;
    documentName: string;
    chunkId: string;
    similarity: number;
    excerpt: string;
  }>;
  summary: string;
}

export interface ToolOutput {
  result: string;
  toolName: string;
  toolArgs?: Record<string, any>;
  success: boolean;
}

export interface CriticOutput {
  isValid: boolean;
  confidence: number;
  feedback: string;
  suggestions?: string[];
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  category: "planning" | "research" | "execution" | "evaluation" | "general";
  reasoning: string;
}

export interface RoutingDecision {
  selectedAgents: AgentType[]; // can route to multiple agents
  confidence: number;
  reasoning: string;
  parallelizable: boolean; // can some agents run in parallel
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedCompletionTime: number;
}

export interface ExecutionStep {
  stepId: string;
  agent: AgentType;
  input: string;
  dependencies?: string[]; // step IDs it depends on
  parallelizable?: boolean;
}

export interface AgentLogEntry {
  conversationId: string;
  agentType: AgentType;
  agentName: string;
  input: string;
  output: string;
  status: "pending" | "success" | "error";
  executionTime: number;
  tokenUsage?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AgentMetricsData {
  agentType: AgentType;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  averageTokenUsage: number;
  routingFrequency: number;
  errorRate: number;
}
