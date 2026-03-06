/**
 * Agent Routing Engine
 * Decides which agent(s) should handle a given query
 */

import type {
  IntentClassification,
  RoutingDecision,
  AgentType,
  ExecutionPlan,
  ExecutionStep,
} from "./types";

interface RoutingRule {
  pattern: RegExp;
  primaryAgent: AgentType;
  secondaryAgents?: AgentType[];
  parallelizable?: boolean;
}

export class RoutingEngine {
  private routingRules: RoutingRule[] = [
    {
      pattern: /^(plan|organize|structure|break down|how should|step by step)/i,
      primaryAgent: "planner",
      secondaryAgents: ["research", "critic"],
      parallelizable: false,
    },
    {
      pattern: /^(research|find|search|look up|tell me about|explain|what is)/i,
      primaryAgent: "research",
      secondaryAgents: ["critic"],
      parallelizable: false,
    },
    {
      pattern: /^(execute|run|do|create|build|generate|write|analyze|compute)/i,
      primaryAgent: "tool",
      secondaryAgents: ["critic"],
      parallelizable: false,
    },
    {
      pattern:
        /^(evaluate|review|assess|check|validate|verify|critique|judge)/i,
      primaryAgent: "critic",
      secondaryAgents: ["tool"],
      parallelizable: false,
    },
  ];

  private agentCapabilities = {
    planner: {
      description:
        "Breaks down complex queries into subtasks and creates execution plans",
      inputTypes: ["complex-queries", "multi-step-problems"],
      outputTypes: ["task-list", "execution-plan"],
    },
    research: {
      description:
        "Retrieves relevant information from documents and knowledge base",
      inputTypes: ["factual-questions", "information-requests"],
      outputTypes: ["summaries", "source-references"],
    },
    tool: {
      description: "Executes structured operations and generates outputs",
      inputTypes: ["operational-tasks", "data-processing"],
      outputTypes: ["results", "generated-content"],
    },
    critic: {
      description:
        "Evaluates outputs for quality, correctness, and appropriateness",
      inputTypes: ["draft-outputs", "requires-validation"],
      outputTypes: ["feedback", "recommendations"],
    },
  };

  /**
   * Route a query to appropriate agent(s) based on intent classification
   */
  route(intent: IntentClassification, userQuery: string): RoutingDecision {
    const agents: AgentType[] = [];
    let confidence = intent.confidence;
    let parallelizable = false;

    // Determine primary agent from intent category
    const primaryAgent = this.mapIntentToAgent(intent.category);
    agents.push(primaryAgent);

    // For planning queries, always add research and tool for comprehensive answers
    if (intent.category === "planning" || intent.intent === "planning") {
      if (!agents.includes("research")) {
        agents.push("research");
      }
      if (!agents.includes("tool")) {
        agents.push("tool");
      }
      parallelizable = true; // Can run research and tool in parallel
    } else {
      // Check if query requires additional agents
      if (this.requiresCritic(userQuery)) {
        agents.push("critic");
      }

      if (this.requiresResearch(userQuery) && primaryAgent !== "research") {
        agents.push("research");
        parallelizable = true;
      }
    }

    // Remove duplicates while preserving planned agent as primary
    const uniqueAgents = [...new Set(agents)];

    // Build reasoning
    const reasoning = `Route to ${uniqueAgents.join(", ")} based on intent "${intent.intent}" (confidence: ${(confidence * 100).toFixed(1)}%). ${this.buildRoutingReasoning(intent, userQuery)}`;

    return {
      selectedAgents: uniqueAgents,
      confidence,
      reasoning,
      parallelizable,
    };
  }

  /**
   * Create an execution plan from a routing decision
   */
  createExecutionPlan(
    routing: RoutingDecision,
    originalQuery: string,
  ): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    const agentExecutionTimes: Record<AgentType, number> = {
      planner: 1000,
      research: 2000,
      tool: 1500,
      critic: 800,
    };

    let stepIndex = 0;
    let estimatedTime = 0;

    if (routing.parallelizable && routing.selectedAgents.length > 1) {
      // Create parallel steps for independent agents
      const maxTime = Math.max(
        ...routing.selectedAgents.map((agent) => agentExecutionTimes[agent]),
      );

      for (const agent of routing.selectedAgents) {
        steps.push({
          stepId: `step-${stepIndex}`,
          agent,
          input: originalQuery,
          parallelizable: true,
        });
        stepIndex++;
      }
      estimatedTime = maxTime;
    } else {
      // Sequential execution
      for (const agent of routing.selectedAgents) {
        const dependency = stepIndex > 0 ? `step-${stepIndex - 1}` : undefined;
        steps.push({
          stepId: `step-${stepIndex}`,
          agent,
          input: originalQuery,
          dependencies: dependency ? [dependency] : undefined,
        });
        estimatedTime += agentExecutionTimes[agent];
        stepIndex++;
      }
    }

    return {
      steps,
      estimatedCompletionTime: estimatedTime,
    };
  }

  /**
   * Map intent category to primary agent
   */
  private mapIntentToAgent(category: string): AgentType {
    const mapping: Record<string, AgentType> = {
      planning: "planner",
      research: "research",
      execution: "tool",
      evaluation: "critic",
      general: "planner", // default fallback
    };
    return mapping[category] || "planner";
  }

  /**
   * Check if query requires evaluation by critic
   */
  private requiresCritic(query: string): boolean {
    const criticIndicators = [
      "verify",
      "check",
      "validate",
      "correct",
      "good",
      "bad",
      "quality",
      "appropriate",
      "is this",
      "review",
      "ensure",
      "accurate",
      "reliable",
    ];

    const hasCriticIndicator = criticIndicators.some((indicator) =>
      query.toLowerCase().includes(indicator),
    );

    // Also check query length - longer queries might benefit from critic review
    const isComplex = query.split(" ").length > 20;

    return hasCriticIndicator || isComplex;
  }

  /**
   * Check if query requires research
   */
  private requiresResearch(query: string): boolean {
    const researchIndicators = [
      "research",
      "find",
      "search",
      "look up",
      "tell me",
      "information",
      "about",
      "background",
      "source",
      "reference",
      "document",
    ];

    return researchIndicators.some((indicator) =>
      query.toLowerCase().includes(indicator),
    );
  }

  /**
   * Build detailed reasoning for routing decision
   */
  private buildRoutingReasoning(
    intent: IntentClassification,
    query: string,
  ): string {
    const reasons: string[] = [];

    // Add intent-specific reasoning
    if (intent.category === "planning") {
      reasons.push("Complex query requires task breakdown");
    } else if (intent.category === "research") {
      reasons.push("Information retrieval needed from documents");
    } else if (intent.category === "execution") {
      reasons.push("Operational task execution required");
    } else if (intent.category === "evaluation") {
      reasons.push("Output validation and assessment needed");
    }

    // Add query-specific reasoning
    if (query.includes("step")) {
      reasons.push("Step-by-step guidance requested");
    }
    if (query.length > 100) {
      reasons.push("Complex multi-part query detected");
    }

    return reasons.join(". ");
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agent: AgentType) {
    return this.agentCapabilities[agent];
  }

  /**
   * Adjust routing based on past agent performance
   */
  adjustRoutingByPerformance(
    routing: RoutingDecision,
    metrics: Record<AgentType, { successRate: number; avgTime: number }>,
  ): RoutingDecision {
    // Boost confidence for agents with higher success rates
    const avgSuccessRate =
      routing.selectedAgents.reduce(
        (sum, agent) => sum + metrics[agent].successRate,
        0,
      ) / routing.selectedAgents.length;

    const adjustedConfidence = Math.min(
      1,
      routing.confidence + (avgSuccessRate - 0.8) * 0.2,
    );

    return {
      ...routing,
      confidence: adjustedConfidence,
      reasoning: routing.reasoning + ` (adjusted for agent performance)`,
    };
  }
}
