/**
 * Token Counter Service
 * Estimates token usage for text content
 */

/**
 * Simple token counter based on word count estimation
 * For production, use tiktoken or a proper tokenizer
 */
export class TokenCounter {
  /**
   * Estimate tokens in text (rough approximation)
   * Average: 1 token ≈ 4 characters or 0.75 words
   */
  static countTokens(text: string): number {
    if (!text) return 0;

    // Rough estimation: split on whitespace and estimate
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;

    // Use average of word-based and char-based estimates
    const tokensByWords = Math.ceil(words * 1.3);
    const tokensByChars = Math.ceil(chars / 4);

    return Math.max(tokensByWords, tokensByChars);
  }

  /**
   * Count tokens in messages array
   */
  static countMessageTokens(
    messages: Array<{ role: string; content: string }>,
  ): number {
    let total = 0;

    for (const message of messages) {
      // Add base tokens for message structure
      total += 4; // role tokens
      total += this.countTokens(message.content);
    }

    return total;
  }

  /**
   * Estimate input and output tokens
   */
  static estimateTokenUsage(
    input: string,
    output: string,
  ): { input: number; output: number } {
    return {
      input: this.countTokens(input),
      output: this.countTokens(output),
    };
  }

  /**
   * Calculate token cost (rough estimate for local models)
   */
  static estimateCost(
    tokenCount: number,
    modelType: "local" | "external" = "local",
  ): number {
    if (modelType === "local") {
      return 0; // Local models have no API cost
    }

    // Rough external model pricing (adjust based on actual rates)
    // Typically ~$0.001-0.01 per 1K tokens
    return (tokenCount / 1000) * 0.005;
  }
}
