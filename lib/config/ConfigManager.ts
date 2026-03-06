/**
 * Configuration Management System
 */

export interface ModelConfig {
  name: string;
  url: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface LLMConfig {
  primary: ModelConfig;
  fallback?: ModelConfig;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

export interface SystemConfig {
  llm: LLMConfig;
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    similarityThreshold: number;
    topK: number;
  };
  memory: {
    summarizationThreshold: number;
    maxMemories: number;
    embeddingDimensions: number;
  };
  metrics: {
    enableCollection: boolean;
    aggregationInterval: number;
  };
  security: {
    enableInjectionDetection: boolean;
    enableOutputValidation: boolean;
    enableSecretDetection: boolean;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    enableFileLogging: boolean;
    logFilePath: string;
  };
}

class ConfigManager {
  private static config: SystemConfig = this.loadDefaults();

  /**
   * Load default configuration
   */
  private static loadDefaults(): SystemConfig {
    return {
      llm: {
        primary: {
          name: process.env.LLM_MODEL || "mistral",
          url: process.env.OLLAMA_URL || "http://localhost:11434",
          timeout: parseInt(process.env.LLM_TIMEOUT || "30000"),
          maxRetries: parseInt(process.env.LLM_MAX_RETRIES || "3"),
          retryDelay: parseInt(process.env.LLM_RETRY_DELAY || "1000"),
        },
        fallback: process.env.LLM_FALLBACK_MODEL
          ? {
              name: process.env.LLM_FALLBACK_MODEL,
              url: process.env.LLM_FALLBACK_URL || "http://localhost:11434",
              timeout: 30000,
              maxRetries: 2,
              retryDelay: 2000,
            }
          : undefined,
        temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "2000"),
        topP: parseFloat(process.env.LLM_TOP_P || "0.9"),
        topK: parseInt(process.env.LLM_TOP_K || "40"),
      },
      rag: {
        chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || "1000"),
        chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || "200"),
        similarityThreshold: parseFloat(
          process.env.RAG_SIMILARITY_THRESHOLD || "0.5",
        ),
        topK: parseInt(process.env.RAG_TOP_K || "5"),
      },
      memory: {
        summarizationThreshold: parseInt(
          process.env.MEMORY_SUMMARIZATION_THRESHOLD || "20",
        ),
        maxMemories: parseInt(process.env.MEMORY_MAX_MEMORIES || "100"),
        embeddingDimensions: parseInt(
          process.env.MEMORY_EMBEDDING_DIMS || "100",
        ),
      },
      metrics: {
        enableCollection: process.env.METRICS_ENABLED !== "false",
        aggregationInterval: parseInt(
          process.env.METRICS_AGGREGATION_INTERVAL || "60000",
        ),
      },
      security: {
        enableInjectionDetection:
          process.env.SECURITY_INJECTION_DETECTION !== "false",
        enableOutputValidation:
          process.env.SECURITY_OUTPUT_VALIDATION !== "false",
        enableSecretDetection:
          process.env.SECURITY_SECRET_DETECTION !== "false",
      },
      logging: {
        level: (process.env.LOG_LEVEL || "info") as
          | "debug"
          | "info"
          | "warn"
          | "error",
        enableFileLogging: process.env.LOG_FILE_ENABLED === "true",
        logFilePath: process.env.LOG_FILE_PATH || "./logs/app.log",
      },
    };
  }

  /**
   * Get complete configuration
   */
  static getConfig(): Readonly<SystemConfig> {
    return Object.freeze(this.config);
  }

  /**
   * Get LLM configuration
   */
  static getLLMConfig(): Readonly<LLMConfig> {
    return Object.freeze(this.config.llm);
  }

  /**
   * Get RAG configuration
   */
  static getRAGConfig() {
    return Object.freeze(this.config.rag);
  }

  /**
   * Get Memory configuration
   */
  static getMemoryConfig() {
    return Object.freeze(this.config.memory);
  }

  /**
   * Check if feature is enabled
   */
  static isFeatureEnabled(
    feature:
      | "injectionDetection"
      | "outputValidation"
      | "secretDetection"
      | "metrics",
  ): boolean {
    return (
      this.config.security[
        `enable${feature.charAt(0).toUpperCase() + feature.slice(1).replace(/Detection/, "Detection")}` as keyof typeof this.config.security
      ] !== false &&
      (feature !== "metrics" || this.config.metrics.enableCollection)
    );
  }

  /**
   * Update configuration (for testing)
   */
  static updateConfig(partial: Partial<SystemConfig>) {
    this.config = {
      ...this.config,
      ...partial,
    };
  }

  /**
   * Reset to defaults
   */
  static reset() {
    this.config = this.loadDefaults();
  }
}

export default ConfigManager;
