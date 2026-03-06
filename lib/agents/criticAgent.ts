/**
 * Critic Agent
 * Evaluates outputs for quality, correctness, and appropriateness
 */

import { BaseAgent } from "./baseAgent";
import { prisma } from "@/lib/db/service";
import type { AgentPayload, AgentResponse, CriticOutput } from "./types";

interface EvaluationCriteria {
  name: string;
  weight: number;
  evaluate: (input: string, context?: Record<string, any>) => number;
}

export class CriticAgent extends BaseAgent {
  private criteria: EvaluationCriteria[] = [];

  constructor() {
    super("critic", "CriticAgent-v1");
    this.registerCriteria();
  }

  async execute(payload: AgentPayload): Promise<AgentResponse> {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return this.createErrorResponse(new Error(validation.error));
    }

    try {
      const [output, executionTime] = await this.measureTimeAsync(async () => {
        // Evaluate the input based on multiple criteria
        const evaluation = await this.evaluateContent(
          payload.input,
          payload.context,
        );

        return evaluation;
      });

      const feedbackList = output.suggestions || [output.feedback];

      const response: AgentResponse = {
        agentType: "critic",
        status: "success",
        output: output.feedback,
        data: {
          isValid: output.isValid,
          confidence: output.confidence,
          suggestions: output.suggestions,
        },
        reasoning: `Evaluation completed with ${output.confidence.toFixed(2)} confidence. Content is ${output.isValid ? "valid" : "needs improvement"}`,
        executionTime,
      };

      await this.logExecution(payload.conversationId, payload.input, response);
      return response;
    } catch (error) {
      console.error("[CriticAgent] Error:", error);
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
   * Register evaluation criteria
   */
  private registerCriteria(): void {
    this.criteria = [
      {
        name: "completeness",
        weight: 0.25,
        evaluate: (input) => this.evaluateCompleteness(input),
      },
      {
        name: "clarity",
        weight: 0.2,
        evaluate: (input) => this.evaluateClarity(input),
      },
      {
        name: "coherence",
        weight: 0.2,
        evaluate: (input) => this.evaluateCoherence(input),
      },
      {
        name: "accuracy",
        weight: 0.2,
        evaluate: (input) => this.evaluateAccuracy(input),
      },
      {
        name: "relevance",
        weight: 0.15,
        evaluate: (input) => this.evaluateRelevance(input),
      },
    ];
  }

  /**
   * Evaluate content against all criteria
   */
  private async evaluateContent(
    input: string,
    context?: Record<string, any>,
  ): Promise<CriticOutput> {
    if (!input || input.trim().length === 0) {
      return {
        isValid: false,
        confidence: 1.0,
        feedback: "Content is empty. Unable to evaluate.",
        suggestions: ["Provide meaningful content to evaluate"],
      };
    }

    const scores: Record<string, number> = {};
    let weightedScore = 0;

    // Evaluate each criterion
    for (const criterion of this.criteria) {
      const score = criterion.evaluate(input);
      scores[criterion.name] = score;
      weightedScore += score * criterion.weight;
    }

    // Determine validity and confidence
    const isValid = weightedScore >= 0.6;
    const confidence = Math.min(1, 0.5 + weightedScore / 2);

    // Generate feedback
    const feedback = this.generateFeedback(scores, input);
    const suggestions = this.generateSuggestions(scores, input);

    return {
      isValid,
      confidence,
      feedback,
      suggestions,
    };
  }

  /**
   * Generate overall feedback
   */
  private generateFeedback(
    scores: Record<string, number>,
    input: string,
  ): string {
    const weakAreas = Object.entries(scores)
      .filter(([_, score]) => score < 0.6)
      .map(([name]) => name);

    const avgScore =
      Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.values(scores).length;

    let feedback = "";

    if (avgScore >= 0.8) {
      feedback = "Excellent quality output. Minor improvements possible.";
    } else if (avgScore >= 0.6) {
      feedback = "Good quality output with some areas for improvement.";
    } else {
      feedback = "Output needs significant improvement.";
    }

    if (weakAreas.length > 0) {
      feedback += ` Areas needing work: ${weakAreas.join(", ")}.`;
    }

    return feedback;
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    scores: Record<string, number>,
    input: string,
  ): string[] {
    const suggestions: string[] = [];

    if (scores.completeness < 0.7) {
      suggestions.push("Provide more comprehensive coverage of the topic");
    }

    if (scores.clarity < 0.7) {
      suggestions.push("Use clearer language and simpler sentence structures");
    }

    if (scores.coherence < 0.7) {
      suggestions.push("Improve logical flow and coherence between sections");
    }

    if (scores.accuracy < 0.7) {
      suggestions.push("Verify factual accuracy and provide proper citations");
    }

    if (scores.relevance < 0.7) {
      suggestions.push(
        "Ensure all content is directly relevant to the main topic",
      );
    }

    if (input.length < 100) {
      suggestions.push(
        "Content is quite brief. Consider expanding for better coverage",
      );
    }

    return suggestions.length > 0
      ? suggestions
      : ["Content meets quality standards"];
  }

  /**
   * Evaluate completeness (does it cover the topic fully?)
   */
  private evaluateCompleteness(input: string): number {
    const sentences = input
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const wordCount = input.split(/\s+/).length;

    // 0-30 words: low completeness
    // 30-100 words: medium completeness
    // 100+ words: high completeness
    let score = Math.min(1, wordCount / 150);

    // More sentences also indicate better coverage
    score += Math.min(0.3, sentences / 10);

    return Math.min(1, score);
  }

  /**
   * Evaluate clarity (is it easy to understand?)
   */
  private evaluateClarity(input: string): number {
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = input.split(/\s+/);

    let score = 0;

    // Prefer shorter, simpler sentences
    const avgSentenceLength = words.length / sentences.length;
    if (avgSentenceLength < 20) {
      score += 0.5;
    } else if (avgSentenceLength < 30) {
      score += 0.3;
    }

    // Check for complex punctuation (might reduce clarity)
    const semicolonCount = (input.match(/;/g) || []).length;
    const colonCount = (input.match(/:/g) || []).length;
    if (semicolonCount + colonCount > 5) {
      score -= 0.2;
    }

    // Check for passive voice indicators
    const passiveVoiceCount = (
      input.match(/\b(is|are|was|were)\s+\w+ed\b/gi) || []
    ).length;
    if (passiveVoiceCount > sentences.length / 2) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score + 0.3));
  }

  /**
   * Evaluate coherence (does it flow logically?)
   */
  private evaluateCoherence(input: string): number {
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let score = 0.5; // base score

    // Check for transition words/phrases
    const transitionWords = [
      "also",
      "furthermore",
      "moreover",
      "however",
      "therefore",
      "thus",
      "meanwhile",
      "in addition",
      "as a result",
      "in conclusion",
    ];

    const transitionCount = transitionWords.filter((word) =>
      input.toLowerCase().includes(word),
    ).length;

    score += Math.min(0.3, transitionCount / 5);

    // Check for topic consistency (all sentences should relate to main topic)
    if (sentences.length >= 3) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Evaluate accuracy (can we verify factual correctness?)
   */
  private evaluateAccuracy(input: string): number {
    let score = 0.6; // neutral score without external verification

    // Check for citations or sources
    const citationPatterns = [
      /\[.*?\]/g, // [source]
      /\(.*?source.*?\)/gi, // (source)
      /according to/gi,
      /research shows/gi,
      /studies indicate/gi,
    ];

    const citationCount = citationPatterns.reduce(
      (count, pattern) => count + (input.match(pattern) || []).length,
      0,
    );

    if (citationCount > 0) {
      score += 0.2;
    }

    // Check for hedging language (appropriate for uncertainty)
    const hedgingWords = [
      "may",
      "might",
      "possibly",
      "arguably",
      "seems",
      "suggests",
    ];
    const hedgeCount = hedgingWords.filter((word) =>
      input.toLowerCase().includes(word),
    ).length;

    if (hedgeCount > 0 && input.length > 100) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Evaluate relevance (does it address the query?)
   */
  private evaluateRelevance(input: string): number {
    // Without knowing the original query, we can't fully assess relevance
    // But we can check if content is substantive
    const wordCount = input.split(/\s+/).length;
    const nonStopWordCount = input
      .split(/\s+/)
      .filter((word) => word.length > 3).length;

    let score = 0;

    if (wordCount > 50) {
      score += 0.4;
    } else if (wordCount > 20) {
      score += 0.2;
    }

    if (nonStopWordCount / wordCount > 0.6) {
      score += 0.3;
    }

    return Math.min(1, score);
  }
}
