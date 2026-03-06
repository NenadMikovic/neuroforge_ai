import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { streamChatCompletion, OllamaMessage } from "@/lib/llm/ollama";
import {
  getOrCreateUser,
  createConversation,
  getConversation,
  getConversationMessages,
  getUserConversations,
  deleteConversation as deleteConversationRecord,
  updateConversationTitle,
  addMessage,
  addMessageSources,
} from "@/lib/db/service";
import {
  isRateLimited,
  getRemainingRequests,
} from "@/lib/middleware/rateLimit";
import RAGService from "@/lib/rag/ragService";
import { generateEmbedding } from "@/lib/rag/embeddings";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import { SecurityMiddleware } from "@/lib/middleware/securityMiddleware";
import { MetricsMiddleware } from "@/lib/middleware/metricsMiddleware";
import { MemoryService } from "@/lib/services/memoryService";
import { MetricsService } from "@/lib/services/metricsService";
import { TokenCounter } from "@/lib/services/tokenCounter";

export const runtime = "nodejs";

interface ChatRequest {
  conversationId?: string;
  message: string;
  userId: string;
  enableRAG?: boolean;
  useAgents?: boolean;
  conversationHistory?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
  }>;
}

function generateConversationTitle(input: string): string {
  const cleaned = input
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!cleaned) return "New Conversation";

  const words = cleaned.split(" ").slice(0, 7);
  const title = words.join(" ");
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

/**
 * POST /api/chat - Create or continue a conversation with streaming response
 * Uses Agent Orchestrator by default (logs to dashboard)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ChatRequest = await request.json();
    const {
      conversationId,
      message,
      userId,
      enableRAG = true,
      useAgents = false,
      conversationHistory = [],
    } = body;

    // Validate input
    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId and message" },
        { status: 400 },
      );
    }

    // Security: Check for prompt injection and threats
    const securityCheck = await SecurityMiddleware.performSecurityCheck(
      message,
      userId,
      conversationId || "new",
    );

    if (
      !securityCheck.passed &&
      securityCheck.threats.some(
        (t) => t.severity === "high" || t.severity === "critical",
      )
    ) {
      console.warn(
        `[Security] Request blocked for user ${userId}:`,
        securityCheck.threats,
      );
      return NextResponse.json(
        { error: "Request validation failed - security threat detected" },
        { status: 403 },
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
      // Verify conversation exists, otherwise create it
      const existingConv = await getConversation(conversationId);
      if (existingConv) {
        convId = conversationId;
      } else {
        // Preserve client-provided id so client and DB stay in sync.
        const conversation = await createConversation(
          userId,
          "New Conversation",
          conversationId,
        );
        convId = conversation.id;
      }
    } else {
      const conversation = await createConversation(userId);
      convId = conversation.id;
    }

    // Memory: Retrieve relevant long-term memories
    let memoryContext = "";
    try {
      const previousMessages = await getConversationMessages(convId, 5);
      const memoryCount = previousMessages.length;

      // Check if we should summarize this conversation
      if (await MemoryService.shouldSummarize(convId)) {
        console.log(`[Memory] Summarizing conversation ${convId}`);
        await MemoryService.summarizeConversation(convId, userId);
      }

      // Retrieve relevant memories
      const relevantMemories = await MemoryService.retrieveRelevantMemories(
        message,
        userId,
        5,
      );

      if (relevantMemories.length > 0) {
        memoryContext =
          MemoryService.formatMemoriesForContext(relevantMemories);
        console.log(
          `[Memory] Retrieved ${relevantMemories.length} relevant memories`,
        );
      }
    } catch (memoryError) {
      console.warn(
        "[Chat] Memory retrieval failed, continuing without context:",
        memoryError,
      );
    }

    // Use Agent Orchestrator if enabled (default for dashboard updates)
    if (useAgents) {
      console.log(`[Chat] Using Agent Orchestrator for: "${message}"`);
      try {
        const orchestrator = new AgentOrchestrator({
          enableParallel: true,
          enableLogging: true,
          timeout: 30000,
        });

        // Format conversation history for the orchestrator
        const historyForOrchestrator = conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

        const result = await orchestrator.processQuery(
          convId,
          userId,
          message,
          historyForOrchestrator,
        );

        const latency = Date.now() - startTime;
        const inputTokens = TokenCounter.countTokens(message);
        const outputTokens = TokenCounter.countTokens(result.finalOutput);

        // Persist user message in agent mode (was previously missing).
        await addMessage({
          conversationId: convId,
          role: "user",
          content: message,
        });

        // Auto-title on first user message.
        const existingMessages = await getConversationMessages(convId, 2);
        if (existingMessages.length <= 1) {
          await updateConversationTitle(
            convId,
            generateConversationTitle(message),
          );
        }

        // Save assistant message from orchestrator
        const savedMessage = await addMessage({
          conversationId: convId,
          role: "assistant",
          content: result.finalOutput,
          latency,
          tokenUsage: outputTokens,
        });

        // Record metrics for this request
        await MetricsService.recordMetric({
          userId,
          conversationId: convId,
          tokenCount: inputTokens + outputTokens,
          latency,
          agentType: result.selectedAgents?.[0] || "orchestrator",
          toolUsed: undefined,
          modelUsed: "local-orchestrator",
          inputTokens,
          outputTokens,
          errorOccurred: false,
          errorType: undefined,
          retrievalHit: false,
        });

        // Sanitize response for security
        const validationResult = await SecurityMiddleware.validateResponse(
          result.finalOutput,
          userId,
          convId,
        );

        // Stream response to client
        const readable = new ReadableStream<Uint8Array>({
          async start(controller) {
            // Stream response character by character
            for (const char of validationResult.sanitized as string) {
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: "token",
                    content: char,
                    conversationId: convId,
                  }) + "\n",
                ),
              );
              await new Promise((resolve) => setTimeout(resolve, 3));
            }

            // Send completion
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({
                  type: "complete",
                  content: validationResult.sanitized,
                  messageId: savedMessage.id,
                  latency,
                  tokens: outputTokens,
                  sources: [],
                  agentInfo: {
                    intent: result.intent,
                    agents: result.selectedAgents,
                    time: result.totalExecutionTime,
                  },
                }) + "\n",
              ),
            );

            controller.close();
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (agentError) {
        console.error("[Chat] Agent orchestration failed:", agentError);
        console.log("[Chat] Falling back to Ollama");
        // Fall through to Ollama below
      }
    }

    // Get last 10 messages for context (fallback/regular path)
    // Use provided conversation history if available (client-side), otherwise fetch from DB
    let previousMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = conversationHistory.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    if (!previousMessages || previousMessages.length === 0) {
      console.log(
        `[Chat] No client history provided, fetching from DB for convId: ${convId}`,
      );
      const dbMessages = await getConversationMessages(convId, 20);
      previousMessages = dbMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      console.log(`[Chat] Fetched ${previousMessages.length} messages from DB`);
    } else {
      console.log(
        `[Chat] Using ${previousMessages.length} messages from client history`,
      );
    }

    let ragContext = "";
    let retrievedSources: any[] = [];

    // Optional: Retrieve context from documents using RAG
    if (enableRAG) {
      try {
        console.log("[Chat] Generating embedding for query...");
        const embedding = await generateEmbedding(message);

        const ragService = new RAGService();
        console.log("[Chat] Retrieving context from documents...");
        retrievedSources = await ragService.retrieveContext(
          embedding,
          userId,
          5,
        );

        if (retrievedSources.length > 0) {
          ragContext = ragService.formatContext(retrievedSources);
          console.log(
            `[Chat] Retrieved ${retrievedSources.length} relevant chunks`,
          );
        }
      } catch (ragError) {
        console.warn(
          "[Chat] RAG retrieval failed, continuing without context:",
          ragError,
        );
      }
    }

    // Build the messages array with proper system prompt, RAG context, and user message
    const messages: OllamaMessage[] = [
      {
        role: "system",
        content: `You are NeuroForge AI Assistant, a helpful and concise AI assistant.

CRITICAL INSTRUCTIONS:
- Answer ONLY what the user asks. Do not provide extra information unless specifically requested.
- Keep responses SHORT and to the point - 1-3 sentences for simple questions.
- Only explain capabilities or features if the user asks about them.
- If documents are retrieved, cite them as [Source: document_name]. Otherwise, use your knowledge.
- You have access to tools: sql_query, python_exec, file_search, system_metrics. Use them when needed.
- When you remember information about the user from past conversations, it's about THEM, not you. For example, if you learn the user's name is "Nenad", that's the USER's name, not yours.
- You are the AI assistant. The user is the person chatting with you. Never confuse their identity with yours.`,
      },
    ];

    // Inject memory context as a system message if available
    if (memoryContext) {
      messages.push({
        role: "system",
        content: memoryContext,
      });
    }

    // Inject RAG context as a system message with source citations
    if (ragContext) {
      messages.push({
        role: "system",
        content: `Retrieved document excerpts (cite as [Source: document_name]):\n\n${ragContext}`,
      });
    }

    // Add conversation history and current user message
    messages.push(
      ...previousMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: message,
      },
    );

    console.log(
      `[Chat] LLM context: system + ${previousMessages.length} previous messages + current user message`,
    );
    console.log(
      `[Chat] Last 3 messages before current: ${previousMessages
        .slice(-3)
        .map(
          (m) =>
            `[${m.role}] ${m.content.substring(0, 50)}${m.content.length > 50 ? "..." : ""}`,
        )
        .join(" | ")}`,
    );

    // DEBUG: Log the full messages array structure being sent to LLM
    console.log(
      `[Chat] FULL MESSAGE ARRAY sent to LLM has ${messages.length} messages:`,
    );
    messages.forEach((m, i) => {
      console.log(
        `  [${i}] role=${m.role} content=${m.content.substring(0, 80)}${m.content.length > 80 ? "..." : ""}`,
      );
    });

    // Log the actual JSON structure being sent
    console.log(
      `[Chat] SERIALIZED MESSAGES JSON: ${JSON.stringify(messages.map((m) => ({ role: m.role, contentLength: m.content.length })))}`,
    );

    // Create readable stream
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullResponse = "";
        let tokens = 0;

        try {
          for await (const token of streamChatCompletion(messages)) {
            fullResponse += token;
            tokens++;

            // Send token to client
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({
                  type: "token",
                  content: token,
                  conversationId: convId,
                }) + "\n",
              ),
            );
          }

          // Save assistant message with latency
          const latency = Date.now() - startTime;
          const inputTokens = TokenCounter.countTokens(message);
          const outputTokens = tokens;

          // Save user message now (after context was built, before assistant response)
          await addMessage({
            conversationId: convId,
            role: "user",
            content: message,
          });

          // Auto-title on first user message.
          const existingMessages = await getConversationMessages(convId, 2);
          if (existingMessages.length <= 1) {
            await updateConversationTitle(
              convId,
              generateConversationTitle(message),
            );
          }

          const savedMessage = await addMessage({
            conversationId: convId,
            role: "assistant",
            content: fullResponse,
            latency,
            tokenUsage: tokens,
          });

          // Record metrics for this request
          await MetricsService.recordMetric({
            userId,
            conversationId: convId,
            tokenCount: inputTokens + outputTokens,
            latency,
            agentType: "ollama",
            toolUsed: undefined,
            modelUsed: "ollama",
            inputTokens,
            outputTokens,
            errorOccurred: false,
            errorType: undefined,
            retrievalHit: retrievedSources.length > 0,
          });

          // Add sources to message if RAG was used
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
              console.warn(
                "[Chat] Failed to save message sources:",
                sourceError,
              );
            }
          }

          // Sanitize response for security
          const validationResult = await SecurityMiddleware.validateResponse(
            fullResponse,
            userId,
            convId,
          );

          // Send completion message with sources
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: "complete",
                content: validationResult.sanitized,
                messageId: savedMessage.id,
                latency,
                tokens,
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

          // Record error metric
          const latency = Date.now() - startTime;
          const inputTokens = TokenCounter.countTokens(message);
          await MetricsService.recordMetric({
            userId,
            conversationId: convId,
            tokenCount: inputTokens,
            latency,
            agentType: "ollama",
            toolUsed: undefined,
            modelUsed: "ollama",
            inputTokens,
            outputTokens: 0,
            errorOccurred: true,
            errorType:
              error instanceof Error ? error.constructor.name : "unknown",
            retrievalHit: false,
          });

          // Log error
          console.error("[Chat API Error]", {
            conversationId: convId,
            userId,
            error: errorMessage,
            duration: latency,
          });

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
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[Chat API Error]", {
      error: errorMessage,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/chat - Get conversations for user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    // Get or create user
    await getOrCreateUser(userId);

    const conversations = await getUserConversations(userId);
    const hydrated = await Promise.all(
      conversations.map(async (conv: any) => {
        const messages = await getConversationMessages(conv.id, 200);
        return {
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastMessage: conv.messages?.[0]?.content || "",
          messages,
        };
      }),
    );

    return NextResponse.json({ conversations: hydrated });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/chat - Delete a conversation for a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const userId = request.nextUrl.searchParams.get("userId");

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: conversationId and userId" },
        { status: 400 },
      );
    }

    const conversation = await getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    await deleteConversationRecord(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
