/**
 * Enterprise LLM Service with Graceful Fallback
 */

import Logger from "@/lib/logger/Logger";
import ConfigManager, { type ModelConfig } from "@/lib/config/ConfigManager";
import { ErrorClassifier, ErrorCategory } from "@/lib/errors/ErrorClassifier";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokens: number;
  cached: boolean;
}

export interface LLMHealth {
  primary: boolean;
  fallback: boolean;
  latency: number;
  lastChecked: Date;
}

class LLMService {
  private static health: LLMHealth = {
    primary: false,
    fallback: false,
    latency: 0,
    lastChecked: new Date(),
  };

  /**
   * Send request to LLM with automatic fallback
   */
  static async generateCompletion(
    messages: LLMMessage[],
    userId: string,
    conversationId: string,
  ): Promise<LLMResponse> {
    const config = ConfigManager.getLLMConfig();
    const startTime = Date.now();

    Logger.pushContext({
      userId,
      conversationId,
      operation: "generateCompletion",
    });

    try {
      // Try primary model
      Logger.info(
        "LLMService",
        `Attempting primary model: ${config.primary.name}`,
      );

      const result = await this.attemptCompletion(config.primary, messages);
      const latency = Date.now() - startTime;

      this.health.primary = true;
      this.health.latency = latency;
      this.health.lastChecked = new Date();

      Logger.info("LLMService", `Primary model succeeded in ${latency}ms`, {
        model: config.primary.name,
        tokens: result.tokens,
      });

      return result;
    } catch (primaryError) {
      const errorToClassify =
        primaryError instanceof Error
          ? primaryError
          : new Error(String(primaryError));
      const classified = ErrorClassifier.classify(errorToClassify);
      Logger.warn("LLMService", `Primary model failed: ${classified.message}`, {
        model: config.primary.name,
        retryable: classified.retryable,
      });

      this.health.primary = false;

      // Try fallback if available
      if (config.fallback && classified.retryable) {
        Logger.info(
          "LLMService",
          `Attempting fallback model: ${config.fallback.name}`,
        );

        try {
          const result = await this.attemptCompletion(
            config.fallback,
            messages,
          );
          this.health.fallback = true;

          Logger.info("LLMService", `Fallback model succeeded`, {
            model: config.fallback.name,
          });

          return result;
        } catch (fallbackError) {
          const fallbackErrorToClassify =
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError));
          const fallbackClassified = ErrorClassifier.classify(
            fallbackErrorToClassify,
          );
          Logger.error(
            "LLMService",
            `Fallback model also failed: ${fallbackClassified.message}`,
            fallbackErrorToClassify,
          );

          this.health.fallback = false;
          throw new Error("All LLM models failed");
        }
      }

      throw new Error(`LLM service error: ${classified.message}`);
    } finally {
      Logger.popContext();
    }
  }

  /**
   * Attempt completion with specific model
   */
  private static async attemptCompletion(
    model: ModelConfig,
    messages: LLMMessage[],
  ): Promise<LLMResponse> {
    for (let attempt = 0; attempt <= model.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), model.timeout);

        const response = await fetch(`${model.url}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model.name,
            messages,
            stream: false,
            temperature: ConfigManager.getLLMConfig().temperature,
            num_predict: ConfigManager.getLLMConfig().maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        return {
          content: data.message?.content || data.response || "",
          model: model.name,
          tokens: data.eval_count || 0,
          cached: false,
        };
      } catch (error) {
        if (attempt < model.maxRetries) {
          Logger.warn(
            "LLMService",
            `Retry attempt ${attempt + 1}/${model.maxRetries}`,
            {
              model: model.name,
              delay: model.retryDelay,
            },
          );

          await new Promise((resolve) => setTimeout(resolve, model.retryDelay));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Check health of all models
   */
  static async checkHealth(): Promise<LLMHealth> {
    const config = ConfigManager.getLLMConfig();

    try {
      await this.attemptCompletion(config.primary, [
        { role: "user", content: "ping" },
      ]);
      this.health.primary = true;
    } catch {
      this.health.primary = false;
    }

    if (config.fallback) {
      try {
        await this.attemptCompletion(config.fallback, [
          { role: "user", content: "ping" },
        ]);
        this.health.fallback = true;
      } catch {
        this.health.fallback = false;
      }
    }

    this.health.lastChecked = new Date();
    return this.health;
  }

  /**
   * Get current health status
   */
  static getHealth(): LLMHealth {
    return { ...this.health };
  }

  /**
   * Check if service is healthy
   */
  static isHealthy(): boolean {
    return this.health.primary || this.health.fallback;
  }
}

export default LLMService;
