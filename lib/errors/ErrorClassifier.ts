/**
 * Enterprise Error Classification & Handling
 */

export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  // LLM Errors
  LLM_UNAVAILABLE = "llm_unavailable",
  LLM_TIMEOUT = "llm_timeout",
  LLM_INVALID_RESPONSE = "llm_invalid_response",
  LLM_RATE_LIMITED = "llm_rate_limited",

  // RAG Errors
  RETRIEVAL_FAILED = "retrieval_failed",
  EMBEDDING_FAILED = "embedding_failed",
  DOCUMENT_PROCESSING_FAILED = "document_processing_failed",

  // Agent Errors
  AGENT_EXECUTION_FAILED = "agent_execution_failed",
  INVALID_TOOL_CALL = "invalid_tool_call",
  TOOL_EXECUTION_FAILED = "tool_execution_failed",

  // Database Errors
  DATABASE_ERROR = "database_error",
  QUERY_ERROR = "query_error",

  // Validation Errors
  VALIDATION_ERROR = "validation_error",
  SECURITY_ERROR = "security_error",

  // System Errors
  INTERNAL_ERROR = "internal_error",
  CONFIGURATION_ERROR = "configuration_error",
  DEPENDENCY_ERROR = "dependency_error",
}

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  metadata?: Record<string, any>;
  retryable: boolean;
  userMessage: string;
}

export class ErrorClassifier {
  /**
   * Classify an error for proper handling and logging
   */
  static classify(error: Error | string, context?: string): ClassifiedError {
    const message = error instanceof Error ? error.message : String(error);

    // LLM Errors
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("connection refused")
    ) {
      return {
        category: ErrorCategory.LLM_UNAVAILABLE,
        severity: ErrorSeverity.CRITICAL,
        message: "LLM service unavailable",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage: "AI service is temporarily unavailable. Please try again.",
      };
    }

    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return {
        category: ErrorCategory.LLM_TIMEOUT,
        severity: ErrorSeverity.WARNING,
        message: "LLM request timeout",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage: "Request took too long. Please try again.",
      };
    }

    if (message.includes("429") || message.includes("rate limit")) {
      return {
        category: ErrorCategory.LLM_RATE_LIMITED,
        severity: ErrorSeverity.WARNING,
        message: "LLM rate limited",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage: "Too many requests. Please wait a moment and try again.",
      };
    }

    // RAG Errors
    if (message.includes("retrieval") || message.includes("embedding")) {
      return {
        category: ErrorCategory.RETRIEVAL_FAILED,
        severity: ErrorSeverity.WARNING,
        message: "Document retrieval failed",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage:
          "Could not retrieve documents. Continuing without context.",
      };
    }

    // Tool Execution Errors
    if (message.includes("tool") || message.includes("Tool")) {
      return {
        category: ErrorCategory.TOOL_EXECUTION_FAILED,
        severity: ErrorSeverity.WARNING,
        message: "Tool execution failed",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage: "Tool execution failed. Trying alternative approach.",
      };
    }

    // Security Errors
    if (
      message.includes("injection") ||
      message.includes("security") ||
      message.includes("threat")
    ) {
      return {
        category: ErrorCategory.SECURITY_ERROR,
        severity: ErrorSeverity.ERROR,
        message: "Security threat detected",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: false,
        userMessage: "Your request was rejected for security reasons.",
      };
    }

    // Validation Errors
    if (message.includes("validation") || message.includes("invalid")) {
      return {
        category: ErrorCategory.VALIDATION_ERROR,
        severity: ErrorSeverity.WARNING,
        message: "Validation failed",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: false,
        userMessage: "Invalid input. Please check your request.",
      };
    }

    // Database Errors
    if (
      message.includes("Prisma") ||
      message.includes("database") ||
      message.includes("SQL")
    ) {
      return {
        category: ErrorCategory.DATABASE_ERROR,
        severity: ErrorSeverity.ERROR,
        message: "Database error occurred",
        originalError: error instanceof Error ? error : new Error(message),
        retryable: true,
        userMessage: "Database error. Please try again.",
      };
    }

    // Default: Internal Error
    return {
      category: ErrorCategory.INTERNAL_ERROR,
      severity: ErrorSeverity.ERROR,
      message: message,
      originalError: error instanceof Error ? error : new Error(message),
      retryable: true,
      userMessage: "An unexpected error occurred. Please try again.",
      metadata: {
        context,
      },
    };
  }

  /**
   * Format error for API response
   */
  static formatApiResponse(classified: ClassifiedError) {
    return {
      success: false,
      error: {
        category: classified.category,
        severity: classified.severity,
        userMessage: classified.userMessage,
        retryable: classified.retryable,
      },
    };
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error): boolean {
    const classified = this.classify(error);
    return classified.retryable;
  }

  /**
   * Get severity level
   */
  static getSeverity(error: Error): ErrorSeverity {
    const classified = this.classify(error);
    return classified.severity;
  }
}
