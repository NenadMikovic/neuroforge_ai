/**
 * Typing Indicator Component
 * Shows an animated typing indicator (dots) for assistant responses
 */

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-1">
        <span
          className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-slate-400 ml-1">AI is thinking...</span>
    </div>
  );
}
