"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { type Conversation } from "@/lib/services/chatService";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const router = useRouter();

  return (
    <div className="w-64 bg-[#0a0e17] border-r border-slate-800/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 space-y-2">
        <button
          onClick={() => router.push("/")}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/40 border border-slate-600/50 text-slate-300 font-medium hover:bg-slate-700/60 transition text-sm"
        >
          🏠 Home
        </button>
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-medium hover:bg-cyan-500/30 transition text-sm"
        >
          + New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group relative"
                onClick={() => onSelectConversation(conv.id)}
              >
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                    activeConversationId === conv.id
                      ? "bg-slate-800/80 text-white border border-slate-700/70"
                      : "text-slate-300 hover:bg-slate-900/50"
                  }`}
                >
                  <div className="truncate font-medium">{conv.title}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {conv.lastMessage || "No messages"}
                  </div>
                </button>

                {onDeleteConversation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded transition"
                    title="Delete conversation"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}
