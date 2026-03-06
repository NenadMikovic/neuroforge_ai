/**
 * Conversation Analytics
 * /admin/conversations - Deep dive into conversation patterns
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ConversationSummary {
  id: string;
  userId: string;
  messageCount: number;
  totalTokens: number;
  duration: number;
  createdAt: string;
  lastMessage: string;
  agentsUsed: string[];
  toolsUsed: string[];
  status: "active" | "completed" | "paused";
}

interface ConversationStats {
  totalConversations: number;
  averageMessagesPerConv: number;
  averageTokensPerConv: number;
  averageDuration: number;
  mostUsedAgents: { agent: string; count: number }[];
  mostUsedTools: { tool: string; count: number }[];
}

export default function ConversationAnalytics() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(
    null,
  );
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    // Mock conversation data (no real API endpoint in admin context)
    const mockConversations: ConversationSummary[] = [
      {
        id: "conv1",
        userId: "user123",
        messageCount: 8,
        totalTokens: 4512,
        duration: 1240,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        lastMessage: "Thanks for the analysis",
        agentsUsed: ["ResearchAgent", "CriticAgent"],
        toolsUsed: ["web_search", "summarize_document"],
        status: "completed",
      },
      {
        id: "conv2",
        userId: "user456",
        messageCount: 12,
        totalTokens: 6234,
        duration: 2156,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        lastMessage: "Can you help with the next part?",
        agentsUsed: ["PlannerAgent", "ToolAgent", "ResearchAgent"],
        toolsUsed: ["calculate", "web_search"],
        status: "active",
      },
      {
        id: "conv3",
        userId: "user789",
        messageCount: 5,
        totalTokens: 2876,
        duration: 845,
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        lastMessage: "I'll review and get back to you",
        agentsUsed: ["CriticAgent"],
        toolsUsed: [],
        status: "completed",
      },
    ];

    setConversations(mockConversations);

    // Calculate stats
    const agentMap = new Map<string, number>();
    const toolMap = new Map<string, number>();
    let totalTokens = 0;
    let totalDuration = 0;

    mockConversations.forEach((conv) => {
      totalTokens += conv.totalTokens;
      totalDuration += conv.duration;

      conv.agentsUsed.forEach((agent) => {
        agentMap.set(agent, (agentMap.get(agent) || 0) + 1);
      });

      conv.toolsUsed.forEach((tool) => {
        toolMap.set(tool, (toolMap.get(tool) || 0) + 1);
      });
    });

    setStats({
      totalConversations: mockConversations.length,
      averageMessagesPerConv:
        mockConversations.reduce((sum, c) => sum + c.messageCount, 0) /
        mockConversations.length,
      averageTokensPerConv: totalTokens / mockConversations.length,
      averageDuration: totalDuration / mockConversations.length,
      mostUsedAgents: Array.from(agentMap.entries())
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count),
      mostUsedTools: Array.from(toolMap.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count),
    });

    setLoading(false);
  }, []);

  const filteredConversations = conversations.filter((c) =>
    filter === "all" ? true : c.status === filter,
  );

  const statusColor = {
    active: "bg-green-500/20 text-green-400 border-green-500/50",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    paused: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">Conversation Analytics</h1>
          <p className="text-gray-400">
            Deep dive into conversation patterns and trends
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading conversation data...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">
                    Total Conversations
                  </p>
                  <p className="text-3xl font-bold">
                    {stats.totalConversations}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">
                    Avg Messages per Conv
                  </p>
                  <p className="text-3xl font-bold">
                    {stats.averageMessagesPerConv.toFixed(1)}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">
                    Avg Tokens per Conv
                  </p>
                  <p className="text-3xl font-bold">
                    {stats.averageTokensPerConv.toFixed(0)}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">Avg Duration</p>
                  <p className="text-3xl font-bold">
                    {(stats.averageDuration / 1000).toFixed(1)}s
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-sm text-gray-400 mb-1">Agents Used</p>
                  <p className="text-3xl font-bold">
                    {stats.mostUsedAgents.length}
                  </p>
                </div>
              </div>
            )}

            {/* Agent & Tool Distribution */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Most Used Agents */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Most Used Agents
                  </h2>
                  <div className="space-y-3">
                    {stats.mostUsedAgents.map((item) => (
                      <div key={item.agent}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold">{item.agent}</p>
                          <span className="text-xs text-gray-400">
                            {item.count} times
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(item.count / stats.mostUsedAgents[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Used Tools */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Most Used Tools
                  </h2>
                  <div className="space-y-3">
                    {stats.mostUsedTools.map((item) => (
                      <div key={item.tool}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold">{item.tool}</p>
                          <span className="text-xs text-gray-400">
                            {item.count} times
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(item.count / stats.mostUsedTools[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex gap-3">
              {["all", "active", "completed"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilter(status as "all" | "active" | "completed")
                  }
                  className={`px-4 py-2 rounded-lg border transition ${
                    filter === status
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-slate-900/50 border-slate-700 text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} (
                  {filteredConversations.length})
                </button>
              ))}
            </div>

            {/* Conversation List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() =>
                      setSelectedConv(
                        selectedConv?.id === conv.id ? null : conv,
                      )
                    }
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selectedConv?.id === conv.id
                        ? "bg-slate-800 border-blue-500"
                        : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{conv.userId}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(conv.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded border text-xs font-semibold ${statusColor[conv.status]}`}
                      >
                        {conv.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                      "{conv.lastMessage}"
                    </p>

                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>💬 {conv.messageCount} messages</span>
                      <span>🔤 {conv.totalTokens} tokens</span>
                      <span>⏱️ {(conv.duration / 1000).toFixed(1)}s</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Conversation Details */}
              {selectedConv && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 lg:sticky lg:top-8 h-fit">
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">
                    Conversation Details
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        User ID
                      </p>
                      <p className="font-mono text-sm">{selectedConv.userId}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        Status
                      </p>
                      <div
                        className={`inline-block px-3 py-1 rounded border text-sm font-semibold ${statusColor[selectedConv.status]}`}
                      >
                        {selectedConv.status.toUpperCase()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Messages
                        </p>
                        <p className="font-bold">{selectedConv.messageCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Tokens
                        </p>
                        <p className="font-bold">{selectedConv.totalTokens}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Duration
                        </p>
                        <p className="font-bold">
                          {(selectedConv.duration / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          Created
                        </p>
                        <p className="font-bold text-xs">
                          {new Date(
                            selectedConv.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedConv.agentsUsed.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2">
                          Agents Used
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedConv.agentsUsed.map((agent, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-xs text-blue-300 rounded"
                            >
                              {agent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedConv.toolsUsed.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2">
                          Tools Used
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedConv.toolsUsed.map((tool, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-green-500/20 border border-green-500/50 text-xs text-green-300 rounded"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Last Message
                      </p>
                      <p className="text-sm text-gray-300 italic">
                        "{selectedConv.lastMessage}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
