/**
 * Retrieval Source Explorer
 * /admin/retrieval - Analyze document retrieval performance
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RetrievalResult {
  id: string;
  query: string;
  timestamp: string;
  documentsRetrieved: number;
  totalDuration: number;
  documents: {
    id: string;
    title: string;
    relevanceScore: number;
    excerpt: string;
    chunkIndex?: number;
  }[];
  model: string;
}

interface DocumentStats {
  documentId: string;
  title: string;
  totalRetrievals: number;
  averageRelevance: number;
  lastRetrieved: string;
}

export default function RetrievalExplorer() {
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [docStats, setDocStats] = useState<DocumentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<RetrievalResult | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"recency" | "relevance" | "duration">(
    "recency",
  );

  useEffect(() => {
    const loadData = async () => {
      // Mock retrieval results (no real API available in admin context)
      const mockResults: RetrievalResult[] = [
        {
          id: "1",
          query: "How does machine learning work?",
          timestamp: new Date(Date.now() - 5000).toISOString(),
          documentsRetrieved: 3,
          totalDuration: 234,
          model: "mistral",
          documents: [
            {
              id: "doc1",
              title: "ML Fundamentals",
              relevanceScore: 0.92,
              excerpt:
                "Machine learning is a subset of artificial intelligence...",
              chunkIndex: 0,
            },
            {
              id: "doc2",
              title: "Neural Networks Overview",
              relevanceScore: 0.87,
              excerpt: "Neural networks are computing systems inspired by...",
              chunkIndex: 2,
            },
            {
              id: "doc3",
              title: "Deep Learning Guide",
              relevanceScore: 0.78,
              excerpt: "Deep learning involves multiple layers of...",
              chunkIndex: 1,
            },
          ],
        },
        {
          id: "2",
          query: "What are embeddings?",
          timestamp: new Date(Date.now() - 30000).toISOString(),
          documentsRetrieved: 2,
          totalDuration: 189,
          model: "mistral",
          documents: [
            {
              id: "doc4",
              title: "Vector Embeddings Explained",
              relevanceScore: 0.95,
              excerpt: "Embeddings are dense vector representations...",
              chunkIndex: 0,
            },
            {
              id: "doc5",
              title: "NLP Techniques",
              relevanceScore: 0.81,
              excerpt: "Word embeddings map words to vectors...",
              chunkIndex: 3,
            },
          ],
        },
      ];

      setResults(mockResults);

      // Calculate document stats
      const docMap = new Map<string, DocumentStats>();
      mockResults.forEach((result) => {
        result.documents.forEach((doc) => {
          const existing = docMap.get(doc.id) || {
            documentId: doc.id,
            title: doc.title,
            totalRetrievals: 0,
            averageRelevance: 0,
            lastRetrieved: result.timestamp,
          };

          existing.totalRetrievals++;
          existing.averageRelevance =
            (existing.averageRelevance * (existing.totalRetrievals - 1) +
              doc.relevanceScore) /
            existing.totalRetrievals;
          existing.lastRetrieved = result.timestamp;

          docMap.set(doc.id, existing);
        });
      });

      setDocStats(Array.from(docMap.values()));
      setLoading(false);
    };

    loadData();
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "duration":
        return a.totalDuration - b.totalDuration;
      case "relevance":
        return (
          (b.documents[0]?.relevanceScore || 0) -
          (a.documents[0]?.relevanceScore || 0)
        );
      case "recency":
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      default:
        return 0;
    }
  });

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return "text-green-400";
    if (score >= 0.8) return "text-blue-400";
    if (score >= 0.7) return "text-yellow-400";
    return "text-red-400";
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
          <h1 className="text-4xl font-bold mb-2">Retrieval Explorer</h1>
          <p className="text-gray-400">
            Analyze document retrieval performance and relevance
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading retrieval data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Document Stats */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold mb-4">
                Documents Retrieved
              </h2>
              {docStats.map((doc) => (
                <div
                  key={doc.documentId}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <p className="font-semibold text-sm mb-2 truncate">
                    {doc.title}
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>Retrievals: {doc.totalRetrievals}</p>
                    <p className={getRelevanceColor(doc.averageRelevance)}>
                      Avg Score: {(doc.averageRelevance * 100).toFixed(0)}%
                    </p>
                    <p className="text-gray-500">
                      {new Date(doc.lastRetrieved).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Retrieval Results */}
            <div className="lg:col-span-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Retrieval Queries</h2>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "recency" | "relevance" | "duration",
                    )
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-gray-300"
                >
                  <option value="recency">Most Recent</option>
                  <option value="relevance">Highest Relevance</option>
                  <option value="duration">Fastest</option>
                </select>
              </div>

              <div className="space-y-4">
                {sortedResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setSelectedResult(
                          selectedResult?.id === result.id ? null : result,
                        )
                      }
                      className="w-full text-left p-4 hover:bg-slate-800/30 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {result.query}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <p>{result.documentsRetrieved} docs</p>
                          <p>{result.totalDuration}ms</p>
                        </div>
                      </div>

                      {/* Top Relevance Bars */}
                      <div className="space-y-1">
                        {result.documents.slice(0, 3).map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-12">
                              {doc.title}
                            </span>
                            <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                              <div
                                className={`h-full ${
                                  doc.relevanceScore >= 0.9
                                    ? "bg-green-500"
                                    : doc.relevanceScore >= 0.8
                                      ? "bg-blue-500"
                                      : doc.relevanceScore >= 0.7
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                }`}
                                style={{
                                  width: `${doc.relevanceScore * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-8">
                              {(doc.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {selectedResult?.id === result.id && (
                      <div className="bg-slate-950/50 border-t border-slate-700 p-4 space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-2">
                            Query
                          </p>
                          <p className="text-sm text-gray-300">
                            {result.query}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-3">
                            Retrieved Documents
                          </p>
                          <div className="space-y-3">
                            {result.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="bg-slate-900/50 border border-slate-700 p-3 rounded"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {doc.title}
                                    </p>
                                    {doc.chunkIndex !== undefined && (
                                      <p className="text-xs text-gray-500">
                                        Chunk #{doc.chunkIndex}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`text-sm font-semibold ${getRelevanceColor(doc.relevanceScore)}`}
                                  >
                                    {(doc.relevanceScore * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {doc.excerpt}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">
                              Model Used
                            </p>
                            <p className="font-mono">{result.model}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">
                              Query Duration
                            </p>
                            <p className="font-semibold">
                              {result.totalDuration}ms
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
