"use client";

import React, { useState, useCallback, useRef } from "react";
import { ChatWindow } from "@/app/components/ChatWindow";
import { ConversationSidebar } from "@/app/components/ConversationSidebar";
import {
  chatService,
  type Conversation,
  type Message,
} from "@/lib/services/chatService";
import { showErrorToast, showSuccessToast } from "@/lib/utils/toast";

function generateTitleFromFirstMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Conversation";
  const title = cleaned.split(" ").slice(0, 7).join(" ");
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const initializedRef = useRef(false);

  // Get active conversation
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  // Create new conversation
  const handleNewConversation = useCallback(() => {
    const newConv = chatService.createConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    showSuccessToast("New conversation created");
  }, []);

  // Select conversation
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  // Update conversation messages
  const handleMessagesUpdate = useCallback(
    (messages: Message[]) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? (() => {
                const firstUserMessage = messages.find(
                  (m) => m.role === "user",
                );
                const nextTitle =
                  conv.title === "New Conversation" && firstUserMessage
                    ? generateTitleFromFirstMessage(firstUserMessage.content)
                    : conv.title;

                return {
                  ...conv,
                  title: nextTitle,
                  messages,
                  lastMessage: messages[messages.length - 1]?.content.substring(
                    0,
                    50,
                  ),
                };
              })()
            : conv,
        ),
      );
    },
    [activeConversationId],
  );

  // Delete conversation
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await chatService.deleteConversation(id);
      } catch (error) {
        showErrorToast("Failed to delete conversation");
        return;
      }

      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          setActiveConversationId(remaining[0]?.id || null);
        }
        return remaining;
      });
      showSuccessToast("Conversation deleted");
    },
    [activeConversationId],
  );

  // Load persistent conversations from DB on first render
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loadConversations = async () => {
      try {
        const loaded = await chatService.loadConversations();
        setConversations(loaded);
        if (loaded.length > 0) {
          setActiveConversationId(loaded[0].id);
        }
      } catch (error) {
        showErrorToast("Failed to load conversations");
      } finally {
        setHasLoaded(true);
      }
    };

    loadConversations();
  }, []);

  // Start with a default conversation if no persistent history exists
  React.useEffect(() => {
    if (
      hasLoaded &&
      conversations.length === 0 &&
      activeConversationId === null
    ) {
      handleNewConversation();
    }
  }, [
    hasLoaded,
    conversations.length,
    activeConversationId,
    handleNewConversation,
  ]);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId || undefined}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-800/50 bg-[#0a0e17] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">
                  {activeConversation?.title || "Select a conversation"}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {activeConversation?.messages.length || 0} messages
                </p>
              </div>
              <div className="flex gap-4 text-sm text-slate-400">
                <a
                  href="/documents"
                  className="hover:text-cyan-400 transition"
                  title="Manage documents for RAG"
                >
                  📚 Documents
                </a>
                <a
                  href="http://localhost:11434"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition"
                  title="Ollama running locally"
                >
                  🔷 Ollama
                </a>
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 overflow-hidden">
            {activeConversation ? (
              <ChatWindow
                conversationId={activeConversation.id}
                messages={activeConversation.messages}
                onMessagesUpdate={handleMessagesUpdate}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>No conversation selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
