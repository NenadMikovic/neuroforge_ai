/**
 * Intent Classification Layer
 * Determines the user's intent and categorizes the query
 */

import type { IntentClassification } from "./types";

const INTENT_PATTERNS = {
  planning: {
    keywords: [
      "plan",
      "organize",
      "structure",
      "breakdown",
      "steps",
      "how to",
      "guide",
      "process",
      "workflow",
    ],
    patterns: [
      /how should i|how do i|what are the steps/i,
      /break.*down|create.*plan|organize|step[s]?\s*by\s*step/i,
    ],
  },
  research: {
    keywords: [
      "research",
      "find",
      "search",
      "look up",
      "investigate",
      "explore",
      "what is",
      "explain",
      "tell me about",
      "who",
      "information",
      "details",
      "background",
    ],
    patterns: [
      /what is|explain|tell me about|how does|why|research|find|search|investigate|who is|who are|who\s/i,
      /background|information|details|learn about|study|author|document|reference/i,
    ],
  },
  execution: {
    keywords: [
      "execute",
      "run",
      "do",
      "perform",
      "create",
      "build",
      "generate",
      "write",
      "make",
    ],
    patterns: [
      /execute|run|perform|create|build|generate|write|make|implement/i,
      /compute|calculate|analyze|process|handle|do this/i,
    ],
  },
  evaluation: {
    keywords: [
      "evaluate",
      "review",
      "assess",
      "check",
      "validate",
      "verify",
      "critique",
      "judge",
      "rate",
    ],
    patterns: [
      /evaluate|review|assess|check|validate|verify|critique|judge|rate|correct/i,
      /is this|good|bad|quality|correct|appropriate|suitable/i,
    ],
  },
};

const COMPLEXITY_INDICATORS = {
  high: [
    "complex",
    "difficult",
    "multiple",
    "various",
    "different",
    "several",
    "many",
  ],
  low: ["simple", "easy", "quick", "fast", "one", "single"],
};

export class IntentClassifier {
  /**
   * Classify the user's intent from their query
   */
  classifyIntent(
    query: string,
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>,
  ): IntentClassification {
    const lowerQuery = query.toLowerCase();

    // Build context from conversation history
    let contextStr = "";
    if (conversationHistory && conversationHistory.length > 0) {
      // Get last 5 messages for context
      const recentMessages = conversationHistory.slice(-5);
      contextStr = recentMessages
        .map((msg) => msg.content.toLowerCase())
        .join(" ");
    }

    // Calculate scores for each intent category
    const scores: Record<string, number> = {
      planning: this.scoreIntent(
        lowerQuery,
        INTENT_PATTERNS.planning,
        contextStr,
      ),
      research: this.scoreIntent(
        lowerQuery,
        INTENT_PATTERNS.research,
        contextStr,
      ),
      execution: this.scoreIntent(
        lowerQuery,
        INTENT_PATTERNS.execution,
        contextStr,
      ),
      evaluation: this.scoreIntent(
        lowerQuery,
        INTENT_PATTERNS.evaluation,
        contextStr,
      ),
    };

    // Find the highest scoring intent
    const [intent, score] = Object.entries(scores).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev,
    );

    // Calculate confidence based on score and query length
    const confidence = Math.min(
      1,
      (score / 10) * (1 + Math.log(query.length) / 10),
    );

    // Determine specific intent string
    let specificIntent = intent;
    if (intent === "planning") {
      specificIntent = this.detectPlanningType(lowerQuery);
    } else if (intent === "research") {
      specificIntent = this.detectResearchType(lowerQuery);
    } else if (intent === "execution") {
      specificIntent = this.detectExecutionType(lowerQuery);
    }

    const reasoning = `Intent detected as "${specificIntent}" with confidence ${(confidence * 100).toFixed(1)}% based on query analysis. Score breakdown: ${Object.entries(
      scores,
    )
      .map(([k, v]) => `${k}=${v.toFixed(1)}`)
      .join(", ")}`;

    return {
      intent: specificIntent,
      confidence,
      category: intent as any,
      reasoning,
    };
  }

  /**
   * Score a query against an intent pattern set, optionally with conversation context
   */
  private scoreIntent(
    query: string,
    patterns: { keywords: string[]; patterns: RegExp[] },
    context?: string,
  ): number {
    let score = 0;

    // Check keyword matches in query
    for (const keyword of patterns.keywords) {
      if (query.includes(keyword)) {
        score += 2;
      }
    }

    // Check regex pattern matches
    for (const pattern of patterns.patterns) {
      if (pattern.test(query)) {
        score += 3;
      }
    }

    // Check context for relevant keywords (from conversation history)
    if (context) {
      for (const keyword of patterns.keywords) {
        if (context.includes(keyword)) {
          score += 1; // Lower weight for context matches
        }
      }
    }

    return score;
  }

  /**
   * Detect specific planning type
   */
  private detectPlanningType(query: string): string {
    if (query.includes("step") || query.includes("process")) {
      return "step-by-step-planning";
    } else if (query.includes("organize") || query.includes("structure")) {
      return "organizational-planning";
    } else if (query.includes("workflow")) {
      return "workflow-planning";
    }
    return "planning";
  }

  /**
   * Detect specific research type
   */
  private detectResearchType(query: string): string {
    if (query.includes("compare") || query.includes("difference")) {
      return "comparative-research";
    } else if (query.includes("background") || query.includes("history")) {
      return "background-research";
    } else if (query.includes("specific") || query.includes("detail")) {
      return "detailed-research";
    }
    return "research";
  }

  /**
   * Detect specific execution type
   */
  private detectExecutionType(query: string): string {
    if (
      query.includes("generate") ||
      query.includes("create") ||
      query.includes("write")
    ) {
      return "content-generation";
    } else if (query.includes("analyze") || query.includes("compute")) {
      return "data-analysis";
    } else if (query.includes("summarize") || query.includes("summarise")) {
      return "summarization";
    }
    return "execution";
  }

  /**
   * Detect query complexity
   */
  detectComplexity(query: string): "high" | "low" {
    const lowerQuery = query.toLowerCase();
    const highScore = COMPLEXITY_INDICATORS.high.filter((ind) =>
      lowerQuery.includes(ind),
    ).length;
    const lowScore = COMPLEXITY_INDICATORS.low.filter((ind) =>
      lowerQuery.includes(ind),
    ).length;
    const wordCount = query.split(" ").length;

    // More complex if: many words, explicit complexity indicators, or low score < high score
    if (wordCount > 20 || highScore > lowScore) {
      return "high";
    }
    return "low";
  }

  /**
   * Extract key entities from query (e.g., topics, numbers, etc.)
   */
  extractEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract numbers/dates
    const numbers = query.match(/\d+/g);
    if (numbers) {
      entities.numbers = numbers.map(Number);
    }

    // Extract quoted phrases
    const quoted = query.match(/"([^"]*)"/g);
    if (quoted) {
      entities.quotedPhrases = quoted.map((q) => q.slice(1, -1));
    }

    // Extract potential topics (capitalized words)
    const topics = query.match(/\b[A-Z][a-z]+\b/g);
    if (topics) {
      entities.topics = topics;
    }

    return entities;
  }
}
