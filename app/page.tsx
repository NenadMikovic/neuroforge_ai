"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden bg-[#0a0a0a]">
        {/* Animated Background */}
        <div className="hero-bg-animated" />
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-orb orb-3" />

        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-12">
            <p className="text-sm font-mono text-slate-400 mb-4 tracking-widest">
              TECHNICAL SHOWCASE
            </p>
            <h1 className="text-6xl sm:text-7xl font-bold leading-tight mb-6 text-white">
              NeuroForge AI
            </h1>
            <p className="text-xl text-slate-300 font-light mb-4">
              Local Enterprise AI Platform
            </p>
          </div>

          <p className="text-center text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            A production-grade AI system featuring custom RAG pipelines,
            multi-agent orchestration, structured tool execution, long-term
            memory, and full observability — built as a technical showcase.
          </p>

          {/* Technical Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-16">
            {[
              "Local LLM Runtime",
              "Custom RAG Engine",
              "Multi-Agent System",
              "Structured Tool Calling",
              "AI Observability",
            ].map((highlight) => (
              <div
                key={highlight}
                className="px-4 py-3 bg-slate-900/50 border border-slate-800 rounded text-sm text-slate-300 text-center font-mono"
              >
                {highlight}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/chat"
              className="px-8 py-3 bg-white text-slate-950 font-semibold rounded hover:bg-slate-100 transition text-center"
            >
              Open Platform
            </Link>
            <Link
              href="/admin/dashboard"
              className="px-8 py-3 border border-slate-700 text-slate-100 font-semibold rounded hover:bg-slate-900/50 transition text-center"
            >
              View Architecture
            </Link>
          </div>
        </div>
      </section>

      {/* What This Project Demonstrates */}
      <section className="border-t border-slate-900 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-white">
            What This Project Demonstrates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Enterprise AI Architecture
              </h3>
              <p className="text-slate-400 leading-relaxed">
                A fully-local AI platform built to simulate an internal
                enterprise AI assistant. No external APIs. No vendor lock-in.
                Complete control over model, data, and inference.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Real-World LLM System Design
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Demonstrates practical patterns: streaming inference, multi-turn
                conversation memory, retrieval-augmented generation, agent
                routing, tool use, and structured output validation.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Production-Oriented Engineering
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Clean service-layer architecture, input validation, security
                middleware, error handling, comprehensive logging, and metrics
                collection throughout the system.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Observability and Metrics
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Token usage tracking, latency measurement, agent routing
                distribution, tool execution metrics, retrieval hit rates, and
                structured logging for all AI operations.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Security-Aware AI Execution
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Prompt injection detection, output validation, sandboxed tool
                execution, role-based access control, and comprehensive audit
                logging of all AI interactions.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-200">
                Full-Stack Technical Skills
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Backend API design, database modeling, stream processing, vector
                embeddings, agent design patterns, React components, TypeScript,
                and infrastructure thinking.
              </p>
            </div>
          </div>

          <p className="mt-12 pt-8 border-t border-slate-900 text-slate-400 leading-relaxed">
            This is explicitly positioned as a portfolio/showcase project — not
            a commercial product. It demonstrates how a senior engineer would
            build a production-grade AI system from first principles.
          </p>
        </div>
      </section>

      {/* Core System Architecture */}
      <section className="border-t border-slate-900 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-white">
            Core System Architecture
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Local LLM Layer */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Local LLM Layer
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>• Ollama runtime for local model execution</p>
                <p>• Streaming token delivery via SSE + AsyncGenerator</p>
                <p>• Support for model switching without restart</p>
                <p>• Currently Mistral 7B; tested with alternative models</p>
              </div>
            </div>

            {/* RAG Engine */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                RAG Engine
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>• Document ingestion (PDF, DOCX, TXT)</p>
                <p>
                  • Recursive text chunking with overlap for context
                  preservation
                </p>
                <p>• All-MiniLM-L6-v2 embeddings (384-dimensional vectors)</p>
                <p>• SQLite vector storage with cosine similarity search</p>
                <p>• Automatic context injection with source attribution</p>
              </div>
            </div>

            {/* Multi-Agent Orchestration */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Multi-Agent Orchestration
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>• Planner Agent: Task decomposition and workflow planning</p>
                <p>
                  • Research Agent: Document retrieval and context gathering
                </p>
                <p>• Tool Agent: Structured tool selection and execution</p>
                <p>• Critic Agent: Output validation and refinement</p>
                <p>
                  • Intent Classifier: Automatic routing to appropriate agent
                </p>
              </div>
            </div>

            {/* Tool Execution Framework */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Tool Execution Framework
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>• Structured JSON tool call parsing and validation</p>
                <p>• SQL read-only execution with query whitelisting</p>
                <p>• Sandboxed Python code execution with RestrictedPython</p>
                <p>• File system search with path constraints</p>
                <p>• System metrics tool for performance monitoring</p>
                <p>• Schema validation before execution</p>
              </div>
            </div>

            {/* Memory Layer */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Memory Layer
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>
                  • Short-term memory: Full conversation history per session
                </p>
                <p>
                  • Long-term memory: LLM-summarized memories stored
                  persistently
                </p>
                <p>
                  • Vector-based memory retrieval: Semantic matching against
                  past interactions
                </p>
                <p>
                  • Automatic memory consolidation to prevent context overflow
                </p>
              </div>
            </div>

            {/* Observability Layer */}
            <div className="border border-slate-900/50 rounded bg-slate-950/30 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Observability & Metrics
              </h3>
              <div className="space-y-2 text-slate-400 text-sm ml-4">
                <p>
                  • Token usage tracking: Input and output tokens per request
                </p>
                <p>
                  • Latency measurement: End-to-end and per-component timing
                </p>
                <p>
                  • Agent routing distribution: Which agents handle which
                  queries
                </p>
                <p>
                  • Tool execution metrics: Success rate, duration, error
                  classification
                </p>
                <p>
                  • Retrieval hit rate: Relevance scoring and chunk selection
                </p>
                <p>
                  • Structured logging: All AI operations logged to database
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters */}
      <section className="border-t border-slate-900 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-white">
            Why This Matters
          </h2>

          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Modern companies are integrating internal AI systems for:
          </p>

          <ul className="space-y-4 mb-8">
            <li className="flex gap-4">
              <span className="text-slate-500 font-bold">•</span>
              <div>
                <p className="font-semibold text-slate-200">
                  Knowledge Retrieval
                </p>
                <p className="text-slate-400 text-sm">
                  Semantic search over internal documentation and databases
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-slate-500 font-bold">•</span>
              <div>
                <p className="font-semibold text-slate-200">Log Analysis</p>
                <p className="text-slate-400 text-sm">
                  Automated parsing and interpretation of system logs
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-slate-500 font-bold">•</span>
              <div>
                <p className="font-semibold text-slate-200">
                  Documentation Assistants
                </p>
                <p className="text-slate-400 text-sm">
                  Interactive navigation through internal documentation
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-slate-500 font-bold">•</span>
              <div>
                <p className="font-semibold text-slate-200">
                  Data Querying Without SQL
                </p>
                <p className="text-slate-400 text-sm">
                  Natural language interface for database access
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-slate-500 font-bold">•</span>
              <div>
                <p className="font-semibold text-slate-200">
                  Workflow Automation
                </p>
                <p className="text-slate-400 text-sm">
                  Agentic control over business processes
                </p>
              </div>
            </li>
          </ul>

          <p className="text-slate-400 leading-relaxed">
            NeuroForge AI demonstrates how such a system can be built locally
            with clean architecture, observability, and security built in from
            the ground up. No vendor dependencies. No API costs. Full control
            and transparency.
          </p>
        </div>
      </section>

      {/* Technical Capabilities */}
      <section className="border-t border-slate-900 px-6 py-20 bg-slate-950/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-white">
            Technical Capabilities
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Custom-built RAG pipeline (no external frameworks)",
              "Lightweight agent orchestration engine",
              "Structured tool execution with validation",
              "Persistent vector storage",
              "AI memory management with summarization",
              "Metrics & evaluation dashboard",
              "Secure prompt handling & injection detection",
              "Role-based access control",
              "Clean service-layer separation",
              "Streaming response handling",
              "Database abstraction with Prisma ORM",
              "Comprehensive audit logging",
            ].map((capability) => (
              <div
                key={capability}
                className="border border-slate-800 rounded bg-slate-900/30 px-6 py-4"
              >
                <p className="text-slate-300 leading-relaxed">{capability}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Observability */}
      <section className="border-t border-slate-900 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-white">
            System Observability
          </h2>

          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            NeuroForge AI includes a built-in AI observability layer that tracks
            all meaningful system behavior:
          </p>

          <ul className="space-y-3 mb-8 text-slate-400">
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Token consumption (input and output counts)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Model latency and response timing</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Tool usage patterns and success rates</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Agent performance and routing decisions</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Error classification and handling</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Retrieval quality and relevance scoring</span>
            </li>
            <li className="flex gap-3">
              <span className="text-slate-600">—</span>
              <span>Security events and audit trails</span>
            </li>
          </ul>

          <p className="text-slate-400 leading-relaxed">
            This represents a production-grade engineering decision. In real
            enterprise systems, observability isn't an afterthought — it's
            architected in from day one to enable debugging, optimization, and
            security monitoring.
          </p>
        </div>
      </section>

      {/* Platform Access */}
      <section className="border-t border-slate-900 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-white">
            Platform Access
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <Link
              href="/chat"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">
                Chat Interface
              </p>
              <p className="text-sm text-slate-400">
                Multi-turn conversation with RAG and agent access
              </p>
            </Link>

            <Link
              href="/agents"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">Agent System</p>
              <p className="text-sm text-slate-400">
                View agent behavior and orchestration
              </p>
            </Link>

            <Link
              href="/documents"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">
                Document Management
              </p>
              <p className="text-sm text-slate-400">
                Upload and manage RAG document corpus
              </p>
            </Link>

            <Link
              href="/admin/dashboard"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">
                Observability Dashboard
              </p>
              <p className="text-sm text-slate-400">
                System metrics, logs, and analytics
              </p>
            </Link>

            <Link
              href="/tools"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">
                Tool Management
              </p>
              <p className="text-sm text-slate-400">
                Configure and test tool execution
              </p>
            </Link>

            <Link
              href="/evaluation"
              className="border border-slate-700 rounded bg-slate-900/50 px-6 py-4 hover:bg-slate-900 transition"
            >
              <p className="font-semibold text-slate-200 mb-2">
                Evaluation Framework
              </p>
              <p className="text-sm text-slate-400">
                Assess system performance metrics
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Showcase Disclaimer */}
      <section className="border-t border-slate-900 px-6 py-20 bg-slate-950/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-400 leading-relaxed max-w-2xl mx-auto">
            NeuroForge AI is a technical showcase project designed to
            demonstrate enterprise-level AI architecture and full-stack
            engineering capabilities. It is not a commercial product. All code
            is built from scratch to illustrate real-world patterns in LLM
            system design.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          <p>Built with Next.js • Prisma • Tailwind • TypeScript • Ollama</p>
        </div>
      </footer>
    </div>
  );
}
