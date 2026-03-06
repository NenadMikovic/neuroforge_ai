"use client";

import { useState, useEffect } from "react";
import { chatService } from "@/lib/services/chatService";

export default function AgentsPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // Get persistent user ID from chat service
    setUserId(chatService.getUserId());
  }, []);

  const handleProcessQuery = async () => {
    if (!query.trim() || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: `conv-${Date.now()}`,
          userId,
          query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "How do I plan a project? Break it down into steps.",
    "What information do we have about artificial intelligence?",
    "Create a summary of these key points: AI, ML, Deep Learning",
    "Evaluate the quality of this response and provide feedback",
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-3">
            Multi-Agent Orchestration System
          </h1>
          <p className="text-xl text-gray-400">
            Intelligent query processing through specialized AI agents
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8 flex gap-4">
          <a
            href="/agents"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            📊 View Dashboard
          </a>
          <a
            href="/chat"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
          >
            💬 Chat with Agents
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Query Input */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6">Test Agent System</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">
                  Enter a query:
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask the agent system anything..."
                  className="w-full h-24 bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleProcessQuery();
                    }
                  }}
                />
              </div>

              <button
                onClick={handleProcessQuery}
                disabled={loading || !query.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
              >
                {loading ? "Processing..." : "Process Query"}
              </button>

              {/* Example Queries */}
              <div className="mt-8">
                <p className="text-sm font-semibold mb-3 text-gray-400">
                  Try these examples:
                </p>
                <div className="space-y-2">
                  {exampleQueries.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(example)}
                      className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition truncate"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          <div className="space-y-4">
            {/* Planner Agent */}
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
              <h3 className="font-bold mb-2">🎯 Planner Agent</h3>
              <p className="text-sm text-gray-300">
                Breaks down complex queries into structured subtasks and creates
                execution plans
              </p>
            </div>

            {/* Research Agent */}
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h3 className="font-bold mb-2">🔍 Research Agent</h3>
              <p className="text-sm text-gray-300">
                Retrieves relevant information from documents using RAG system
              </p>
            </div>

            {/* Tool Agent */}
            <div className="bg-purple-900/30 border border-purple-500 rounded-lg p-4">
              <h3 className="font-bold mb-2">🔧 Tool Agent</h3>
              <p className="text-sm text-gray-300">
                Executes structured operations like analysis and summarization
              </p>
            </div>

            {/* Critic Agent */}
            <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4">
              <h3 className="font-bold mb-2">✅ Critic Agent</h3>
              <p className="text-sm text-gray-300">
                Evaluates output quality against multiple criteria
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="mt-8 bg-red-900/30 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-2 text-red-400">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Agent Response</h2>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Intent</p>
                <p className="font-bold text-lg capitalize">
                  {result.result.intent}
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Agents Used</p>
                <p className="font-bold text-lg">
                  {result.result.selectedAgents.length}
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Execution Time</p>
                <p className="font-bold text-lg">
                  {result.result.totalExecutionTime}ms
                </p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Steps</p>
                <p className="font-bold text-lg">
                  {result.result.executionPlan.stepCount}
                </p>
              </div>
            </div>

            {/* Final Output */}
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="font-bold mb-3">Final Output</h3>
              <p className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                {result.result.finalOutput}
              </p>
            </div>

            {/* Agent Responses */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Agent Responses</h3>
              {result.result.agentResponses.map(
                (
                  response: {
                    agent: string;
                    status: string;
                    output: string;
                    executionTime: number;
                  },
                  idx: number,
                ) => (
                  <div key={idx} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold capitalize">
                        {response.agent}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          response.status === "success"
                            ? "bg-green-600"
                            : "bg-red-600"
                        }`}
                      >
                        {response.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-3">
                      {response.output}
                    </p>
                    <p className="text-xs text-gray-500">
                      Execution time: {response.executionTime}ms
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* System Architecture Info */}
        <div className="mt-12 bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">System Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold mb-3">Intent Classification</h3>
              <p className="text-gray-400 text-sm">
                Analyzes query intent and complexity to determine appropriate
                agent routing
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Agent Routing</h3>
              <p className="text-gray-400 text-sm">
                Routes to single or multiple agents based on query requirements
                and can execute in parallel when possible
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Execution & Logging</h3>
              <p className="text-gray-400 text-sm">
                Executes agents with timeouts, logs all interactions, and tracks
                performance metrics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
