/**
 * Planner Agent
 * Breaks down complex queries into structured subtasks and creates execution plans
 */

import { BaseAgent } from "./baseAgent";
import { prisma } from "@/lib/db/service";
import type { AgentPayload, AgentResponse, PlannerOutput, Task } from "./types";

export class PlannerAgent extends BaseAgent {
  constructor() {
    super("planner", "PlannerAgent-v1");
  }

  async execute(payload: AgentPayload): Promise<AgentResponse> {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return this.createErrorResponse(new Error(validation.error));
    }

    try {
      const [output, executionTime] = await this.measureTimeAsync(async () => {
        const tasks = this.breakdownQuery(payload.input, payload.context);
        const thinking = this.generateThinking(payload.input, tasks);

        // Store tasks in database (non-blocking)
        tasks.forEach((task) => {
          prisma.agentTask
            .create({
              data: {
                conversationId: payload.conversationId,
                originalQuery: payload.input,
                taskDescription: task.description,
                taskType: task.type as any,
                status: "pending",
                metadata: JSON.stringify({
                  priority: task.priority,
                  dependencies: task.dependencies || [],
                  taskId: task.id,
                }),
              },
            })
            .catch((err) => {
              console.error("[PlannerAgent] Failed to store task:", err);
            });
        });

        return { tasks, thinking };
      });

      const response: AgentResponse = {
        agentType: "planner",
        status: "success",
        output: output.thinking,
        data: {
          tasks: output.tasks,
          taskCount: output.tasks.length,
        },
        reasoning: `Created ${output.tasks.length} subtasks for complex query analysis`,
        executionTime,
      };

      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    } catch (error) {
      const errorResponse = this.createErrorResponse(error);
      await this.logExecution(
        payload.conversationId,
        payload.input,
        errorResponse,
      );
      return errorResponse;
    }
  }

  /**
   * Break down a query into structured subtasks
   */
  private breakdownQuery(query: string, context?: Record<string, any>): Task[] {
    const tasks: Task[] = [];
    let taskIndex = 0;

    // Identify query components
    const components = this.identifyComponents(query);

    // For each component, create research and evaluation tasks
    for (const component of components) {
      const componentTasks = this.createComponentTasks(component, taskIndex);
      tasks.push(...componentTasks);
      taskIndex += componentTasks.length;
    }

    // Add final synthesis task
    if (tasks.length > 1) {
      tasks.push({
        id: `task-${taskIndex}`,
        description: "Synthesize findings and create comprehensive response",
        type: "evaluation",
        priority: "high",
        dependencies: tasks.map((t) => t.id),
      });
    }

    // Prioritize tasks
    return this.prioritizeTasks(tasks);
  }

  /**
   * Identify main components/topics in the query
   */
  private identifyComponents(query: string): string[] {
    const components: string[] = [];

    // Split by common conjunctions
    const parts = query.split(/\s+(and|or|as well as|plus)\s+/i);

    for (const part of parts) {
      if (
        part.trim().length > 0 &&
        !["and", "or", "as well as", "plus"].includes(part.toLowerCase())
      ) {
        components.push(part.trim());
      }
    }

    // If no components found, use the whole query
    return components.length > 0 ? components : [query];
  }

  /**
   * Create tasks for a specific component
   */
  private createComponentTasks(component: string, baseIndex: number): Task[] {
    const tasks: Task[] = [];

    // Research task
    tasks.push({
      id: `task-${baseIndex}`,
      description: `Research: ${component}`,
      type: "research",
      priority: "high",
    });

    // Tool/execution task if component suggests action
    if (this.suggestsAction(component)) {
      tasks.push({
        id: `task-${baseIndex + 1}`,
        description: `Execute: ${component}`,
        type: "tool",
        priority: "high",
        dependencies: [`task-${baseIndex}`],
      });
    }

    return tasks;
  }

  /**
   * Check if component suggests an action
   */
  private suggestsAction(component: string): boolean {
    const actionKeywords = [
      "create",
      "generate",
      "write",
      "build",
      "make",
      "produce",
      "execute",
      "run",
      "perform",
      "implement",
      "calculate",
      "analyze",
      "process",
    ];

    return actionKeywords.some((keyword) =>
      component.toLowerCase().includes(keyword),
    );
  }

  /**
   * Prioritize tasks based on dependencies and importance
   */
  private prioritizeTasks(tasks: Task[]): Task[] {
    return tasks.map((task) => {
      // Research tasks are typically high priority (must happen first)
      if (task.type === "research") {
        return { ...task, priority: "high" };
      }
      // Tool tasks depend on research, so medium/high
      if (
        task.type === "tool" &&
        task.dependencies &&
        task.dependencies.length > 0
      ) {
        return { ...task, priority: "high" };
      }
      // Evaluation tasks are last
      if (task.type === "evaluation") {
        return { ...task, priority: "medium" };
      }

      return task;
    });
  }

  /**
   * Generate user-friendly step-by-step guidance
   */
  private generateThinking(query: string, tasks: Task[]): string {
    // For planning queries, generate actionable steps instead of internal breakdown
    const components = this.identifyComponents(query);

    const steps: string[] = [];
    let stepNum = 1;

    // Analyze the query to understand what kind of planning is needed
    const planningType = this.determinePlanningType(query);

    if (
      planningType === "project-organization" ||
      query.toLowerCase().includes("organize")
    ) {
      steps.push("Step 1: Define the scope and goals of your project");
      steps.push("Step 2: Identify all major tasks and deliverables required");
      steps.push("Step 3: Break down tasks into smaller, manageable subtasks");
      steps.push("Step 4: Estimate time and resources needed for each task");
      steps.push(
        "Step 5: Prioritize tasks based on dependencies and importance",
      );
      steps.push("Step 6: Create a timeline with milestones and deadlines");
      steps.push("Step 7: Assign responsibilities and allocate resources");
      steps.push("Step 8: Set up tracking and review mechanisms");
      steps.push("Step 9: Communicate the plan to all stakeholders");
      steps.push("Step 10: Review and adjust as needed throughout execution");
    } else if (planningType === "process-planning") {
      steps.push("Step 1: Understand the desired outcome");
      steps.push("Step 2: Map out the current state and identify gaps");
      steps.push("Step 3: Define clear process steps in sequence");
      steps.push("Step 4: Identify decision points and alternatives");
      steps.push("Step 5: Plan for resource allocation at each stage");
      steps.push("Step 6: Set success metrics and checkpoints");
      steps.push("Step 7: Document the process with examples");
      steps.push("Step 8: Test with a dry run if possible");
      steps.push("Step 9: Implementation and monitoring");
      steps.push("Step 10: Continuous improvement based on feedback");
    } else {
      // Generic planning steps
      steps.push(`Step 1: Analyze the requirement: "${query}"`);
      for (let i = 0; i < components.length; i++) {
        steps.push(`Step ${i + 2}: Address component: ${components[i]}`);
      }
      steps.push(
        `Step ${components.length + 2}: Synthesize and document findings`,
      );
      steps.push(
        `Step ${components.length + 3}: Review for completeness and clarity`,
      );
    }

    return steps.join("\n");
  }

  /**
   * Determine the type of planning needed
   */
  private determinePlanningType(query: string): string {
    const q = query.toLowerCase();

    if (q.includes("project") || q.includes("organize")) {
      return "project-organization";
    } else if (q.includes("process") || q.includes("workflow")) {
      return "process-planning";
    } else if (q.includes("plan")) {
      return "strategic-planning";
    }

    return "general-planning";
  }
}
