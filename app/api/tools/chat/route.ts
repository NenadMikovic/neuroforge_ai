/**
 * Tool-Enabled Chat API
 * POST /api/tools/chat - Chat with tool execution support
 * Implements the full tool execution flow integrated with LLM
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getChatCompletionWithTools,
  addToolResultToConversation,
} from "@/lib/llm/toolCalling";
import {
  getOrCreateUser,
  createConversation,
  getConversation,
  getConversationMessages,
  addMessage,
  addMessageSources,
} from "@/lib/db/service";
import { getToolExecutor } from "@/lib/tools/executor";
import {
  isRateLimited,
  getRemainingRequests,
} from "@/lib/middleware/rateLimit";
import RAGService from "@/lib/rag/ragService";
import { generateEmbedding } from "@/lib/rag/embeddings";
import type { OllamaMessage } from "@/lib/llm/ollama";
import type { ToolCall } from "@/lib/tools/types";

export const runtime = "nodejs";

interface ToolChatRequest {
  conversationId?: string;
  message: string;
  userId: string;
  enableRAG?: boolean;
  enableTools?: boolean;
  maxToolIterations?: number;
}

interface ToolExecutionStep {
  type: "tool_call" | "assistant_response" | "error";
  toolName?: string;
  toolCallId?: string;
  content?: string;
  result?: unknown;
  success?: boolean;
  error?: string;
  timestamp: number;
}

/**
 * POST /api/tools/chat - Chat with integrated tool execution
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ToolChatRequest = await request.json();
    const {
      conversationId,
      message,
      userId,
      enableRAG = true,
      enableTools = true,
      maxToolIterations = 3,
    } = body;

    // Validate input
    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId and message" },
        { status: 400 },
      );
    }

    // Check rate limit
    if (isRateLimited(userId)) {
      const remaining = getRemainingRequests(userId);
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          remaining,
        },
        { status: 429 },
      );
    }

    // Get or create user
    await getOrCreateUser(userId);

    // Get or create conversation
    let convId: string;
    if (conversationId) {
      const existingConv = await getConversation(conversationId);
      if (existingConv) {
        convId = conversationId;
      } else {
        const conversation = await createConversation(userId);
        convId = conversation.id;
      }
    } else {
      const conversation = await createConversation(userId);
      convId = conversation.id;
    }

    // Save user message
    await addMessage({
      conversationId: convId,
      role: "user",
      content: message,
    });

    // Get RAG context if enabled
    let ragContext = "";
    let retrievedSources: any[] = [];

    if (enableRAG) {
      try {
        const embedding = await generateEmbedding(message);
        const ragService = new RAGService();
        retrievedSources = await ragService.retrieveContext(
          embedding,
          userId,
          5,
        );

        if (retrievedSources.length > 0) {
          ragContext = ragService.formatContext(retrievedSources);
        }
      } catch (ragError) {
        console.warn("[ToolChat] RAG retrieval failed:", ragError);
      }
    }

    // Build conversation history
    const previousMessages = await getConversationMessages(convId, 10);
    const userMessageWithContext = ragContext
      ? `${ragContext}\n\nUser Question: ${message}`
      : message;

    let conversationMessages: OllamaMessage[] = [
      ...previousMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: userMessageWithContext,
      },
    ];

    // Create streaming response
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const executionSteps: ToolExecutionStep[] = [];
          let finalResponse = "";
          let toolIterations = 0;

          // Tool execution loop
          while (toolIterations < maxToolIterations) {
            toolIterations++;

            // Get LLM response with tool awareness
            const llmResponse = await getChatCompletionWithTools(
              conversationMessages,
              enableTools,
            );

            // Send assistant response content token by token
            if (llmResponse.mainContent) {
              finalResponse = llmResponse.mainContent;

              // Stream response character by character for smooth UI
              for (const char of llmResponse.mainContent) {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      type: "token",
                      content: char,
                      conversationId: convId,
                    }) + "\n",
                  ),
                );
              }
            }

            // Check if there are tool calls
            if (
              !llmResponse.hasToolCalls ||
              llmResponse.toolCalls.length === 0
            ) {
              // No tool calls, done with loop
              break;
            }

            // Execute tools
            const toolExecutor = getToolExecutor();
            const toolResults: Array<{
              toolCall: ToolCall;
              result: any;
            }> = [];

            for (const toolCall of llmResponse.toolCalls) {
              try {
                console.log(
                  `[ToolChat] Executing tool: ${toolCall.tool}:${toolCall.id}`,
                );

                const result = await toolExecutor.execute(toolCall, {
                  conversationId: convId,
                  userId,
                  timestamp: Date.now(),
                });

                toolResults.push({ toolCall, result });

                // Send tool execution event
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      type: "tool_execution",
                      toolName: toolCall.tool,
                      toolCallId: toolCall.id,
                      success: result.success,
                      result: result.result,
                      error: result.error,
                      executionTime: result.executionTime,
                      timestamp: Date.now(),
                    }) + "\n",
                  ),
                );

                executionSteps.push({
                  type: "tool_call",
                  toolName: toolCall.tool,
                  toolCallId: toolCall.id,
                  result: result.result,
                  success: result.success,
                  error: result.error,
                  timestamp: Date.now(),
                });
              } catch (toolError) {
                const errorMsg =
                  toolError instanceof Error
                    ? toolError.message
                    : String(toolError);

                console.error(`[ToolChat] Tool execution error:`, toolError);

                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      type: "tool_error",
                      toolName: toolCall.tool,
                      toolCallId: toolCall.id,
                      error: errorMsg,
                      timestamp: Date.now(),
                    }) + "\n",
                  ),
                );

                executionSteps.push({
                  type: "error",
                  toolName: toolCall.tool,
                  toolCallId: toolCall.id,
                  error: errorMsg,
                  timestamp: Date.now(),
                });
              }
            }

            // If no tools were executed successfully, break
            if (toolResults.length === 0) {
              break;
            }

            // Add assistant response and tool results to conversation
            conversationMessages = [
              ...conversationMessages,
              {
                role: "assistant",
                content: llmResponse.mainContent,
              },
            ];

            // Add tool results to conversation for next iteration
            for (const { toolCall, result } of toolResults) {
              conversationMessages = addToolResultToConversation(
                conversationMessages,
                toolCall.id,
                toolCall.tool,
                result.result,
                result.success,
              );
            }
          }

          // Save final message
          const latency = Date.now() - startTime;
          const savedMessage = await addMessage({
            conversationId: convId,
            role: "assistant",
            content: finalResponse,
            latency,
            tokenUsage: 0,
          });

          // Add sources if RAG was used
          if (enableRAG && retrievedSources.length > 0) {
            try {
              await addMessageSources(
                savedMessage.id,
                retrievedSources.map((source, index) => ({
                  documentId: source.documentId,
                  chunkId: source.chunkId,
                  rankPosition: index,
                  similarity: source.similarity,
                })),
              );
            } catch (sourceError) {
              console.warn("[ToolChat] Failed to save sources:", sourceError);
            }
          }

          // Send completion with metadata
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: "complete",
                content: finalResponse,
                messageId: savedMessage.id,
                latency,
                toolIterations,
                executionSteps,
                sources:
                  retrievedSources.length > 0
                    ? retrievedSources.map((source) => ({
                        documentId: source.documentId,
                        documentName: source.documentName,
                        chunkId: source.chunkId,
                        similarity: source.similarity,
                      }))
                    : undefined,
              }) + "\n",
            ),
          );

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          console.error("[ToolChat Error]", error);

          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: "error",
                error: errorMessage,
              }) + "\n",
            ),
          );
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[ToolChat API Error]", error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
