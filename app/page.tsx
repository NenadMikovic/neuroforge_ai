"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 flex items-center justify-center p-6">
      {/* Animated background gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-120 w-225 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),rgba(15,23,42,0))] blur-3xl animate-pulse" />
        <div
          className="absolute bottom-[-20%] right-[-10%] h-105 w-105 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),rgba(15,23,42,0))] blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute left-[-10%] top-[40%] h-80 w-[320px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),rgba(15,23,42,0))] blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-400/10 text-xl font-bold text-cyan-300">
              NF
            </span>
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-2">
            NeuroForge
          </p>
        </div>

        {/* Main heading */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight bg-linear-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent mb-4">
            Something extraordinary is building.
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 leading-7 max-w-lg mx-auto">
            AI-powered solutions for the future of product design and
            development.
            <span className="block mt-2 text-slate-400">
              Join us as we shape what's next.
            </span>
          </p>
        </div>

        {/* Email capture */}
        <div className="mt-12 mb-12">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-6 py-4 rounded-full border border-slate-700/70 bg-slate-950/60 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition backdrop-blur"
              />
              <button
                type="submit"
                className="px-8 py-4 rounded-full bg-linear-to-r from-cyan-400 to-blue-500 text-slate-950 font-semibold whitespace-nowrap transition hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20"
              >
                {submitted ? "✓ Confirmed" : "Notify Me"}
              </button>
            </div>
          </form>
          {submitted && (
            <p className="text-center text-sm text-cyan-300 mt-3">
              Check your inbox for updates!
            </p>
          )}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "⚡",
              label: "AI-Powered",
              desc: "Designed with artificial intelligence at its core",
            },
            {
              icon: "🚀",
              label: "Next-Gen Stack",
              desc: "Built on cutting-edge technology and frameworks",
            },
            {
              icon: "✨",
              label: "Pixel Perfect",
              desc: "Crafted with attention to every detail",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800/50 bg-slate-950/40 p-5 backdrop-blur text-center hover:border-slate-700/70 transition"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-sm mb-1">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800/50 text-center">
          <p className="text-sm text-slate-400 mb-4">Follow the journey</p>
          <div className="flex justify-center gap-6 text-slate-300">
            <a href="#" className="hover:text-cyan-400 transition text-sm">
              Twitter
            </a>
            <a href="#" className="hover:text-cyan-400 transition text-sm">
              LinkedIn
            </a>
            <a href="#" className="hover:text-cyan-400 transition text-sm">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
