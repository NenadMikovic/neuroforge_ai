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

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
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
            ? {
                ...conv,
                messages,
                lastMessage: messages[messages.length - 1]?.content.substring(
                  0,
                  50,
                ),
              }
            : conv,
        ),
      );
    },
    [activeConversationId],
  );

  // Delete conversation
  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      showSuccessToast("Conversation deleted");
    },
    [activeConversationId],
  );

  // Start with a default conversation if none exists
  React.useEffect(() => {
    if (conversations.length === 0 && !initializedRef.current) {
      initializedRef.current = true;
      handleNewConversation();
    }
  }, [conversations.length, handleNewConversation]);

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
