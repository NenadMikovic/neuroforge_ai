"use client";

import React, { useRef, useEffect, useState } from "react";
import { chatService, type Message } from "@/lib/services/chatService";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  conversationId: string;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  isLoading?: boolean;
}

export function ChatWindow({
  conversationId,
  messages,
  onMessagesUpdate,
  isLoading = false,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(
    null,
  );
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      createdAt: new Date(),
    };

    setInputValue("");
    setIsStreaming(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add user message
    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    updatedMessages.push(assistantMessage);
    onMessagesUpdate(updatedMessages);

    try {
      // Stream the response - pass only PREVIOUS messages (excluding current user message)
      // The API will add the current message separately
      for await (const chunk of chatService.streamMessage(
        conversationId,
        userMessage.content,
        abortControllerRef.current.signal,
        messages,
      )) {
        if (chunk.type === "token") {
          // Append token to assistant message
          assistantMessage.content += chunk.content || "";
          onMessagesUpdate([...updatedMessages]);
        } else if (chunk.type === "complete") {
          // Update with final message ID and metadata
          const completeChunk = chunk as {
            type: "complete";
            messageId?: string;
            latency?: number;
            tokens?: number;
            sources?: Array<{
              documentId: string;
              documentName: string;
              chunkId: string;
              similarity: number;
            }>;
          };
          assistantMessage.id = completeChunk.messageId || assistantMessage.id;
          assistantMessage.latency = completeChunk.latency;
          assistantMessage.tokens = completeChunk.tokens;
          assistantMessage.sources = completeChunk.sources;
          onMessagesUpdate([...updatedMessages]);
        } else if (chunk.type === "error") {
          // Remove assistant message on error
          updatedMessages.pop();
          onMessagesUpdate([...updatedMessages]);
          console.error("Chat error:", chunk.error);
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      // Remove assistant message on error
      updatedMessages.pop();
      onMessagesUpdate([...updatedMessages]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0e17]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">
                Start a new conversation
              </p>
              <p className="text-sm">Type a message to begin</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex transition-all duration-300 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-xs lg:max-w-2xl">
                <div
                  className={`px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-cyan-500/20 border border-cyan-400/50 text-slate-100"
                      : "bg-slate-800/40 border border-slate-700/50 text-slate-100"
                  }`}
                >
                  {msg.role === "assistant" &&
                  !msg.content &&
                  isStreaming &&
                  msg.id.startsWith("assistant-") ? (
                    <TypingIndicator />
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.latency && (
                        <p className="text-xs text-slate-400 mt-2">
                          {msg.tokens} tokens • {msg.latency}ms
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={() =>
                        setExpandedSourcesId(
                          expandedSourcesId === msg.id ? null : msg.id,
                        )
                      }
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition font-medium"
                    >
                      {expandedSourcesId === msg.id ? "▼" : "▶"}{" "}
                      {msg.sources.length} source
                      {msg.sources.length !== 1 ? "s" : ""}
                    </button>

                    {expandedSourcesId === msg.id && (
                      <div className="space-y-1 mt-2">
                        {msg.sources.map((source, idx) => (
                          <div
                            key={`${msg.id}-${idx}`}
                            className="text-xs bg-slate-700/30 border border-slate-600 rounded p-2 space-y-1"
                          >
                            <div className="font-medium text-slate-200">
                              📄 {source.documentName}
                            </div>
                            <div className="text-slate-400">
                              Similarity: {(source.similarity * 100).toFixed(1)}
                              %
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/50 p-4 bg-[#0a0e17]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-700/70 bg-slate-950/60 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-50 transition"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-6 py-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-300 font-medium hover:bg-red-500/30 transition flex items-center gap-2"
              title="Stop AI response"
            >
              <span className="text-lg">⏹</span>
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-medium hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
