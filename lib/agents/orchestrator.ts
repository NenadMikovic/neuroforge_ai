/**
 * Agent Orchestrator
 * Coordinates the multi-agent system execution
 */

import { IntentClassifier } from "./intentClassifier";
import { RoutingEngine } from "./routingEngine";
import { PlannerAgent } from "./plannerAgent";
import { ResearchAgent } from "./researchAgent";
import { ToolAgent } from "./toolAgent";
import { CriticAgent } from "./criticAgent";
import { getChatCompletion } from "@/lib/llm/ollama";
import {
  getToolEnabledSystemPrompt,
  detectExplicitToolRequest,
  executeExplicitTool,
} from "@/lib/llm/toolCalling";
import { prisma } from "@/lib/db/service";
import type {
  AgentType,
  AgentPayload,
  AgentResponse,
  ExecutionPlan,
} from "./types";

interface OrchestratorConfig {
  enableParallel?: boolean;
  enableLogging?: boolean;
  timeout?: number; // ms
}

import type { BaseAgent } from "./baseAgent";

export interface ExecutionResult {
  conversationId: string;
  originalQuery: string;
  intent: string;
  selectedAgents: AgentType[];
  responses: Map<AgentType, AgentResponse>;
  finalOutput: string;
  totalExecutionTime: number;
  executionPlan: ExecutionPlan;
}

export class AgentOrchestrator {
  private intentClassifier: IntentClassifier;
  private routingEngine: RoutingEngine;
  private agents: Map<AgentType, BaseAgent>;
  private config: Required<OrchestratorConfig>;

  constructor(config: OrchestratorConfig = {}) {
    this.intentClassifier = new IntentClassifier();
    this.routingEngine = new RoutingEngine();

    // Initialize all agents with error handling
    this.agents = new Map<AgentType, BaseAgent>();

    // Initialize each agent safely
    const agents: [AgentType, () => BaseAgent][] = [
      ["planner", () => new PlannerAgent()],
      ["research", () => new ResearchAgent()],
      ["tool", () => new ToolAgent()],
      ["critic", () => new CriticAgent()],
    ];

    for (const [agentType, createAgent] of agents) {
      try {
        this.agents.set(agentType, createAgent());
        console.log(`[Orchestrator] Initialized ${agentType} agent`);
      } catch (error) {
        console.error(
          `[Orchestrator] Failed to initialize ${agentType} agent:`,
          error,
        );
        // Continue initialization even if one agent fails
      }
    }

    this.config = {
      enableParallel: config.enableParallel ?? true,
      enableLogging: config.enableLogging ?? true,
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Process a user query through the multi-agent system
   */
  async processQuery(
    conversationId: string,
    userId: string,
    query: string,
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>,
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    try {
      // Explicit tool request should bypass intent routing and execute directly.
      const explicitTool = detectExplicitToolRequest(query);
      if (explicitTool.isExplicitRequest && explicitTool.toolName) {
        const toolOutput = await executeExplicitTool(
          explicitTool.toolName,
          explicitTool.extractedCode || query,
          userId,
        );

        const toolResponse: AgentResponse = {
          agentType: "tool",
          status: "success",
          output: toolOutput,
          executionTime: Math.round(performance.now() - startTime),
          reasoning: `Explicit tool request detected for ${explicitTool.toolName}`,
        };

        const responses = new Map<AgentType, AgentResponse>();
        responses.set("tool", toolResponse);

        return {
          conversationId,
          originalQuery: query,
          intent: "explicit-tool-request",
          selectedAgents: ["tool"],
          responses,
          finalOutput: toolOutput,
          totalExecutionTime: Math.round(performance.now() - startTime),
          executionPlan: {
            steps: [
              {
                stepId: "step-0",
                agent: "tool",
                input: query,
              },
            ],
            estimatedCompletionTime: Math.round(performance.now() - startTime),
          },
        };
      }

      // Step 1: Intent Classification (now with conversation context)
      console.log(`[Orchestrator] Processing query: "${query}"`);
      const intent = this.intentClassifier.classifyIntent(
        query,
        conversationHistory,
      );
      console.log(
        `[Orchestrator] Detected intent: ${intent.intent} (${intent.category})`,
      );

      // Log routing decision
      const entities = this.intentClassifier.extractEntities(query);

      // Step 2: Agent Routing
      const routing = this.routingEngine.route(intent, query);
      console.log(
        `[Orchestrator] Routing to agents: ${routing.selectedAgents.join(", ")}`,
      );

      // Log routing decision (non-blocking)
      prisma.agentRoutingLog
        .create({
          data: {
            conversationId,
            query,
            detectedIntent: intent.intent,
            selectedAgent: routing.selectedAgents[0],
            confidence: routing.confidence,
            reasoning: routing.reasoning,
          },
        })
        .catch((err) => {
          console.error("[Orchestrator] Failed to log routing decision:", err);
        });

      // Step 3: Create Execution Plan
      const executionPlan = this.routingEngine.createExecutionPlan(
        routing,
        query,
      );
      console.log(
        `[Orchestrator] Created execution plan with ${executionPlan.steps.length} steps`,
      );

      // Step 4: Execute Agents with conversation history
      const payload: AgentPayload = {
        conversationId,
        userId,
        input: query,
        context: {
          userId,
          intent: intent.intent,
          entities,
          complexity: this.intentClassifier.detectComplexity(query),
          conversationHistory: conversationHistory || [],
        },
      };

      const responses = await this.executeAgents(
        routing.selectedAgents,
        payload,
      );

      // Step 5: Post-process Results
      const finalOutput = await this.synthesizeOutputs(responses, query);

      const totalExecutionTime = Math.round(performance.now() - startTime);

      const result: ExecutionResult = {
        conversationId,
        originalQuery: query,
        intent: intent.intent,
        selectedAgents: routing.selectedAgents,
        responses,
        finalOutput,
        totalExecutionTime,
        executionPlan,
      };

      console.log(
        `[Orchestrator] Execution completed in ${totalExecutionTime}ms`,
      );
      return result;
    } catch (error) {
      console.error(`[Orchestrator] Error processing query:`, error);
      throw error;
    }
  }

  /**
   * Execute agents based on routing decision
   */
  private async executeAgents(
    agentTypes: AgentType[],
    payload: AgentPayload,
  ): Promise<Map<AgentType, AgentResponse>> {
    const responses = new Map<AgentType, AgentResponse>();

    // Filter to only available agents
    const availableAgents = agentTypes.filter((at) => this.agents.has(at));

    if (availableAgents.length === 0) {
      console.warn("[Orchestrator] No agents available for execution");
      return responses;
    }

    if (this.config.enableParallel && availableAgents.length > 1) {
      // Parallel execution
      const promises = availableAgents.map(async (agentType) => {
        const agent = this.agents.get(agentType);
        if (!agent) {
          return {
            agentType,
            response: {
              agentType,
              status: "error" as const,
              output: "Agent not available",
              error: "Agent not initialized",
              executionTime: 0,
            },
          };
        }

        try {
          const response = await Promise.race([
            agent.execute(payload),
            this.createTimeoutPromise(this.config.timeout),
          ]);
          return { agentType, response };
        } catch (error) {
          console.error(`[Orchestrator] Agent ${agentType} failed:`, error);
          return {
            agentType,
            response: {
              agentType,
              status: "error" as const,
              output: "Agent execution failed",
              error: error instanceof Error ? error.message : "Unknown error",
              executionTime: 0,
            },
          };
        }
      });

      const results = await Promise.all(promises);
      for (const { agentType, response } of results) {
        responses.set(agentType, response);
      }
    } else {
      // Sequential execution
      for (const agentType of availableAgents) {
        const agent = this.agents.get(agentType);
        if (!agent) {
          responses.set(agentType, {
            agentType,
            status: "error",
            output: "Agent not available",
            error: "Agent not initialized",
            executionTime: 0,
          });
          continue;
        }

        try {
          const response = await Promise.race([
            agent.execute(payload),
            this.createTimeoutPromise(this.config.timeout),
          ]);
          responses.set(agentType, response);
        } catch (error) {
          console.error(`[Orchestrator] Agent ${agentType} failed:`, error);
          responses.set(agentType, {
            agentType,
            status: "error",
            output: "Agent execution failed",
            error: error instanceof Error ? error.message : "Unknown error",
            executionTime: 0,
          });
        }
      }
    }

    return responses;
  }

  /**
   * Synthesize outputs from multiple agents
   */
  private async synthesizeOutputs(
    responses: Map<AgentType, AgentResponse>,
    originalQuery: string,
  ): Promise<string> {
    const plannerResponse = responses.get("planner");
    const researchResponse = responses.get("research");
    const toolResponse = responses.get("tool");
    const criticResponse = responses.get("critic");

    console.log(
      `[Orchestrator] Synthesizing outputs - Research status: ${researchResponse?.status}, Planner status: ${plannerResponse?.status}`,
    );

    // If we have research output, use it as primary answer
    if (researchResponse && researchResponse.status === "success") {
      let answer = `${researchResponse.output}`;

      // Only add planner steps if research actually found relevant sources
      // Don't add planner steps if research says "No relevant sources found" or "Using general knowledge"
      const hasRealSources =
        !(
          answer.includes("No relevant sources found") ||
          answer.includes("Using general knowledge")
        ) && !answer.includes("not found");

      console.log(
        `[Orchestrator] Research has real sources: ${hasRealSources}`,
      );

      // If research didn't find real sources, use Mistral to answer with general knowledge
      if (!hasRealSources) {
        try {
          console.log(
            "[Orchestrator] Research found no sources, using Mistral for general knowledge response",
          );
          answer = await getChatCompletion([
            {
              role: "system",
              content: getToolEnabledSystemPrompt(),
            },
            {
              role: "user",
              content: originalQuery,
            },
          ]);
          console.log(
            `[Orchestrator] Mistral response generated, length: ${answer.length}`,
          );
        } catch (error) {
          console.error("[Orchestrator] Mistral fallback failed:", error);
          // Keep the research response if Mistral fails
        }
      } else {
        // Add planner steps if we have real sources
        if (
          hasRealSources &&
          plannerResponse &&
          plannerResponse.status === "success"
        ) {
          const planText = plannerResponse.output;
          // Extract steps if available
          if (planText.includes("step") || planText.includes("Step")) {
            answer += `\n\nRecommended approach:\n${planText}`;
          }
        }

        // Add tool analysis if available and it has real content
        if (
          toolResponse &&
          toolResponse.status === "success" &&
          !toolResponse.output.includes("No applicable tool")
        ) {
          answer += `\n\nAdditional analysis:\n${toolResponse.output}`;
        }

        // Add critic evaluation (quality feedback) if excellent
        if (criticResponse && criticResponse.status === "success") {
          const evaluation = criticResponse.output;
          if (evaluation.includes("high") || evaluation.includes("excellent")) {
            // Only show critic if it's positive
            answer += `\n\n${evaluation}`;
          }
        }
      }

      return answer;
    }

    // If no research but we have planner, convert the plan to a narrative answer
    if (plannerResponse && plannerResponse.status === "success") {
      const plan = plannerResponse.output;

      // Convert structured plan to narrative steps
      let narrativeAnswer = "Here's how to approach this:\n\n";

      // Extract numbered steps if they exist
      const stepMatches = plan.match(/step \d+:.*?(?=step \d+|$)/gi);
      if (stepMatches && stepMatches.length > 0) {
        stepMatches.forEach((step, index) => {
          narrativeAnswer += `${index + 1}. ${step.replace(/^step \d+:\s*/i, "").trim()}\n\n`;
        });
      } else {
        // Fallback: use the plan as-is but clean it up
        narrativeAnswer = plan
          .replace(/Plan:|breakdown:|tasks?:/gi, "")
          .replace(/created \d+ .*?task/gi, "")
          .trim();
      }

      // Add tool analysis if available
      if (toolResponse && toolResponse.status === "success") {
        narrativeAnswer += `\n\nKey considerations:\n${toolResponse.output}`;
      }

      return narrativeAnswer;
    }

    // If we have tool output, use it
    if (toolResponse && toolResponse.status === "success") {
      return toolResponse.output;
    }

    // Fallback: concatenate all available responses
    const parts: string[] = [];
    if (plannerResponse && plannerResponse.status === "success") {
      parts.push(plannerResponse.output);
    }
    if (researchResponse && researchResponse.status === "success") {
      parts.push(researchResponse.output);
    }
    if (toolResponse && toolResponse.status === "success") {
      parts.push(toolResponse.output);
    }
    if (criticResponse && criticResponse.status === "success") {
      parts.push(criticResponse.output);
    }

    // If we have some response, use it
    if (parts.length > 0) {
      return parts.join("\n\n");
    }

    // Final fallback: Use Mistral for any query
    try {
      console.log(
        "[Orchestrator] All agents failed or returned no results, using Mistral fallback",
      );
      const mistralAnswer = await getChatCompletion([
        {
          role: "system",
          content: getToolEnabledSystemPrompt(),
        },
        {
          role: "user",
          content: originalQuery,
        },
      ]);
      return mistralAnswer;
    } catch (error) {
      console.error("[Orchestrator] Mistral fallback also failed:", error);
      return `Query: ${originalQuery}\n\nThe system encountered issues processing your request. Please try again.`;
    }
  }

  /**
   * Create a promise that rejects after timeout
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Execution timeout after ${ms}ms`)),
        ms,
      ),
    );
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics() {
    return prisma.agentMetrics.findMany();
  }

  /**
   * Get routing statistics
   */
  async getRoutingStatistics(conversationId?: string) {
    if (conversationId) {
      return prisma.agentRoutingLog.findMany({
        where: { conversationId },
      });
    }
    return prisma.agentRoutingLog.findMany();
  }

  /**
   * Get agent logs
   */
  async getAgentLogs(conversationId?: string, limit: number = 50) {
    return prisma.agentLog.findMany({
      where: conversationId ? { conversationId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get execution summary for a conversation
   */
  async getExecutionSummary(conversationId: string) {
    const [logs, routingLogs, tasks] = await Promise.all([
      prisma.agentLog.findMany({
        where: { conversationId },
      }),
      prisma.agentRoutingLog.findMany({
        where: { conversationId },
      }),
      prisma.agentTask.findMany({
        where: { conversationId },
      }),
    ]);

    const agentStats: Record<string, any> = {};

    for (const log of logs) {
      if (!agentStats[log.agentType]) {
        agentStats[log.agentType] = {
          count: 0,
          totalTime: 0,
          errors: 0,
        };
      }
      agentStats[log.agentType].count++;
      agentStats[log.agentType].totalTime += log.executionTime;
      if (log.status === "error") {
        agentStats[log.agentType].errors++;
      }
    }

    return {
      logs,
      routingLogs,
      tasks,
      agentStats,
      totalAgentCalls: logs.length,
      totalExecutionTime: logs.reduce(
        (sum: number, log: any) => sum + log.executionTime,
        0,
      ),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  async resetMetrics() {
    await prisma.agentMetrics.deleteMany();
  }
}
