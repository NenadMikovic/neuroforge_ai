/**
 * Agent System Usage Examples and Integration Guide
 * Shows how to integrate the multi-agent orchestration system
 */

import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import { IntentClassifier } from "@/lib/agents/intentClassifier";
import { RoutingEngine } from "@/lib/agents/routingEngine";
import type { ExecutionResult } from "./orchestrator";

/**
 * Example 1: Basic query processing through the agent system
 */
export async function exampleBasicProcessing() {
  const orchestrator = new AgentOrchestrator({
    enableParallel: true,
    enableLogging: true,
  });

  const result = await orchestrator.processQuery(
    "conv-123", // conversationId
    "user-456", // userId
    "How do I plan a vacation? What are the main steps and what tools do I need?",
  );

  console.log("Agent Result:", {
    intent: result.intent,
    selectedAgents: result.selectedAgents,
    finalOutput: result.finalOutput,
    executionTime: result.totalExecutionTime,
  });

  return result;
}

/**
 * Example 2: Get performance metrics for a specific agent
 */
export async function exampleGetMetrics() {
  const orchestrator = new AgentOrchestrator();

  // Get all metrics
  const metrics = await orchestrator.getAgentMetrics();
  console.log("Agent Metrics:", metrics);

  // Get routing statistics
  const routing = await orchestrator.getRoutingStatistics();
  console.log("Routing Statistics:", routing);

  // Get logs for a conversation
  const logs = await orchestrator.getAgentLogs("conv-123");
  console.log("Agent Logs:", logs);

  return { metrics, routing, logs };
}

/**
 * Example 3: Get execution summary for monitoring
 */
export async function exampleExecutionSummary() {
  const orchestrator = new AgentOrchestrator();

  const summary = await orchestrator.getExecutionSummary("conv-123");

  console.log("Execution Summary:", {
    totalAgentCalls: summary.totalAgentCalls,
    totalExecutionTime: summary.totalExecutionTime,
    agentStats: summary.agentStats,
  });

  return summary;
}

/**
 * Example 4: Integrate with chat system
 * This shows how to add agent orchestration to the chat API
 */
export async function exampleChatIntegration(
  conversationId: string,
  userId: string,
  userMessage: string,
) {
  const orchestrator = new AgentOrchestrator({
    enableParallel: true,
    enableLogging: true,
  });

  // Process through agent system
  const agentResult = await orchestrator.processQuery(
    conversationId,
    userId,
    userMessage,
  );

  // The finalOutput combines all agent responses
  const assistantResponse = agentResult.finalOutput;

  // You can also access individual agent responses
  for (const [agentType, response] of agentResult.responses) {
    console.log(`${agentType}: ${response.output}`);
  }

  return {
    conversationId,
    message: assistantResponse,
    metadata: {
      intent: agentResult.intent,
      agents: agentResult.selectedAgents,
      executionTime: agentResult.totalExecutionTime,
    },
  };
}

/**
 * Example 5: Custom agent configuration
 */
export async function exampleCustomConfiguration() {
  const orchestrator = new AgentOrchestrator({
    enableParallel: true, // Allow agents to run in parallel where possible
    enableLogging: true, // Log all executions to database
    timeout: 30000, // 30 second timeout per agent
  });

  // Process queries with custom configuration
  const result = await orchestrator.processQuery(
    "conv-123",
    "user-456",
    "Research the latest developments in AI and provide an analysis",
  );

  return result;
}

/**
 * Example 6: Monitor agent performance
 */
export async function examplePerformanceMonitoring() {
  const orchestrator = new AgentOrchestrator();

  // Get current metrics
  const metrics = await orchestrator.getAgentMetrics();

  // Analyze performance
  const performanceAnalysis = metrics.map((m: any) => ({
    agent: m.agentType,
    executions: m.totalExecutions,
    successRate: ((m.successCount / m.totalExecutions) * 100).toFixed(2) + "%",
    avgTime: m.averageExecutionTime + "ms",
    errorCount: m.errorCount,
    lastRun: m.lastExecution,
  }));

  console.table(performanceAnalysis);

  return performanceAnalysis;
}

/**
 * Example 7: Query analysis and classification
 */
export async function exampleIntentClassification() {
  const classifier = new IntentClassifier();

  const queries = [
    "How do I learn Python?",
    "What's the capital of France?",
    "Create a detailed plan for my project",
    "Evaluate this code for quality",
    "Find information about climate change",
  ];

  const classifications = queries.map((query) => ({
    query,
    intent: classifier.classifyIntent(query),
    complexity: classifier.detectComplexity(query),
    entities: classifier.extractEntities(query),
  }));

  return classifications;
}

/**
 * Example 8: Agent routing analysis
 */
export async function exampleRoutingAnalysis() {
  const classifier = new IntentClassifier();
  const router = new RoutingEngine();

  const query = "Break down how to build a web application step by step";
  const intent = classifier.classifyIntent(query);
  const routing = router.route(intent, query);
  const executionPlan = router.createExecutionPlan(routing, query);

  console.log({
    query,
    detectedIntent: intent.intent,
    selectedAgents: routing.selectedAgents,
    confidence: routing.confidence,
    executionSteps: executionPlan.steps.length,
    estimatedTime: executionPlan.estimatedCompletionTime,
  });

  return { intent, routing, executionPlan };
}

/**
 * Example 9: Batch processing multiple queries
 */
export async function exampleBatchProcessing(
  conversationId: string,
  userId: string,
  queries: string[],
) {
  const orchestrator = new AgentOrchestrator();

  const results: ExecutionResult[] = [];

  for (const query of queries) {
    try {
      const result = await orchestrator.processQuery(
        conversationId,
        userId,
        query,
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to process query: ${query}`, error);
    }
  }

  // Aggregate results
  const summary = {
    totalQueries: queries.length,
    successfulQueries: results.length,
    totalExecutionTime: results.reduce(
      (sum, r) => sum + r.totalExecutionTime,
      0,
    ),
    agentUsageFrequency: {} as Record<string, number>,
  };

  for (const result of results) {
    for (const agent of result.selectedAgents) {
      summary.agentUsageFrequency[agent] =
        (summary.agentUsageFrequency[agent] || 0) + 1;
    }
  }

  return { results, summary };
}

/**
 * Example 10: Integration with monitoring systems
 */
export async function exampleMonitoringIntegration() {
  const orchestrator = new AgentOrchestrator();

  // Fetch all metrics
  const metrics = await orchestrator.getAgentMetrics();
  const routingLogs = await orchestrator.getRoutingStatistics();

  // Prepare data for monitoring dashboard
  const alertingData = {
    // Alert if any agent has > 10% error rate
    highErrorRateAgents: metrics.filter(
      (m: any) => (m.errorCount / m.totalExecutions) * 100 > 10,
    ),

    // Alert if agent response time > 5 seconds
    slowAgents: metrics.filter((m: any) => m.averageExecutionTime > 5000),

    // Track routing decisions
    routingDecisions: routingLogs.length,

    // Calculate system health score (0-100)
    healthScore: calculateHealthScore(metrics),
  };

  return alertingData;
}

/**
 * Helper function to calculate system health score
 */
function calculateHealthScore(metrics: any[]): number {
  if (metrics.length === 0) return 0;

  const avgSuccessRate =
    metrics.reduce((sum, m) => sum + m.successCount / m.totalExecutions, 0) /
    metrics.length;
  const avgResponseTime =
    metrics.reduce((sum, m) => sum + m.averageExecutionTime, 0) /
    metrics.length;

  // Health score formula: 50% success rate + 50% response time penalty
  const successScore = avgSuccessRate * 100;
  const timeScore = Math.max(0, 100 - (avgResponseTime / 1000) * 10);

  return Math.round(successScore * 0.5 + timeScore * 0.5);
}

export default {
  exampleBasicProcessing,
  exampleGetMetrics,
  exampleExecutionSummary,
  exampleChatIntegration,
  exampleCustomConfiguration,
  examplePerformanceMonitoring,
  exampleIntentClassification,
  exampleRoutingAnalysis,
  exampleBatchProcessing,
  exampleMonitoringIntegration,
};
