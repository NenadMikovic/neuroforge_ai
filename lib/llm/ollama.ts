import axios from "axios";

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

/**
 * Stream chat completion from Ollama
 * Returns an async generator that yields tokens as they stream
 */
export async function* streamChatCompletion(
  messages: OllamaMessage[],
  onChunk?: (chunk: string) => void,
): AsyncGenerator<string, void, unknown> {
  try {
    // Log the exact messages being sent to Ollama
    console.log(
      `[Ollama] Sending ${messages.length} messages to Ollama:`,
      JSON.stringify(
        messages.map((m) => ({
          role: m.role,
          contentLength: m.content.length,
          contentStart: m.content.substring(0, 60),
        })),
      ),
    );

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages,
        stream: true,
      },
      {
        responseType: "stream",
        timeout: 120000, // Increased timeout for longer responses
      },
    );

    // Use a simple queue to buffer tokens
    const tokenQueue: string[] = [];
    let streamDone = false;
    let streamError: Error | null = null;

    // Set up event listeners
    response.data.on("data", (chunk: Buffer) => {
      try {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed: OllamaResponse = JSON.parse(line);
              const token = parsed.message.content;
              if (token) {
                tokenQueue.push(token);
                onChunk?.(token);
              }
            } catch (e) {
              // Skip malformed JSON lines
              console.debug("[Ollama] Skipped malformed JSON:", e);
            }
          }
        }
      } catch (error) {
        console.error("[Ollama] Error processing chunk:", error);
        streamError = error as Error;
      }
    });

    response.data.on("end", () => {
      streamDone = true;
    });

    response.data.on("error", (error: Error) => {
      streamError = error;
      streamDone = true;
    });

    // Yield tokens as they arrive
    let tokenIndex = 0;
    while (!streamDone || tokenIndex < tokenQueue.length) {
      if (tokenIndex < tokenQueue.length) {
        yield tokenQueue[tokenIndex];
        tokenIndex++;
      } else if (!streamDone) {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Check for errors after stream finishes
    if (streamError) {
      throw streamError;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Failed to connect to Ollama. Make sure Ollama is running on " +
            OLLAMA_BASE_URL,
        );
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get chat completion without streaming
 */
export async function getChatCompletion(
  messages: OllamaMessage[],
): Promise<string> {
  try {
    const response = await axios.post<OllamaResponse>(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      },
      {
        timeout: 60000,
      },
    );

    return response.data.message.content;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Failed to connect to Ollama. Make sure Ollama is running on " +
            OLLAMA_BASE_URL,
        );
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate that Ollama is available
 */
export async function validateOllamaConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
