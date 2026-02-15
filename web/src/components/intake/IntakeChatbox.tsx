"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ExtractedData = {
  artistName?: string | null;
  email?: string | null;
  genre?: string | null;
  location?: string | null;
  goals?: string | null;
  links?: string[] | null;
  notes?: string | null;
};

type IntakeChatboxProps = {
  user: User;
  onExtractedData?: (data: ExtractedData, complete: boolean) => void;
};

export default function IntakeChatbox({ user, onExtractedData }: IntakeChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content:
            "Hi! I'm the Verified Sound intake assistant. I'm here to help you complete your artist submission. Let's start with the basics — what's your artist or stage name?",
        },
      ]);
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Add user message to UI
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/intake-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Add assistant response to UI
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: data.reply },
      ]);

      // Notify parent of extracted data
      if (onExtractedData && data.extractedData) {
        onExtractedData(data.extractedData, data.intakeComplete || false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "greeting-new",
        role: "assistant",
        content:
          "Chat cleared! Let's start fresh. What's your artist or stage name?",
      },
    ]);
    setError(null);
  };

  return (
    <div
      className="flex flex-col rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
      data-testid="intake-chatbox"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-white">Intake Assistant</span>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-white transition-colors"
          data-testid="clear-chat-btn"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] min-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--primary)]/20 text-white border border-[var(--primary)]/30"
                  : "bg-white/10 text-slate-200 border border-white/10"
              }`}
              data-testid={`chat-message-${msg.role}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-slate-400 border border-white/10 rounded-2xl px-4 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-[var(--primary)]/50 focus:outline-none"
            disabled={loading}
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90 transition-colors"
            data-testid="chat-send-btn"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
