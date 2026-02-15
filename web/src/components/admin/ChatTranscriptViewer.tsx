"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
  extractedData?: Record<string, unknown> | null;
};

type IntakeProfile = {
  intake?: Record<string, unknown>;
  intakeComplete?: boolean;
  updatedAt?: string;
};

type ChatTranscriptViewerProps = {
  userId: string;
  user: User;
  onClose: () => void;
};

export default function ChatTranscriptViewer({ userId, user, onClose }: ChatTranscriptViewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<IntakeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/admin/chat-transcript?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load transcript");
        }

        setMessages(data.messages || []);
        setProfile(data.profile || null);
      } catch (err: any) {
        setError(err.message || "Failed to load transcript");
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [userId, user]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="chat-transcript-modal"
    >
      <div 
        className="w-full max-w-2xl max-h-[80vh] bg-neutral-900 rounded-2xl border border-neutral-700 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Intake Chat Transcript</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-xl"
            data-testid="close-transcript-btn"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-sm text-neutral-400">Loading transcript...</div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-sm text-neutral-400">No chat history found for this user.</div>
          )}

          {/* Profile summary */}
          {profile?.intake && (
            <div className="rounded-lg bg-neutral-800/50 border border-neutral-700 p-3 mb-4">
              <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                Extracted Profile Data
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(profile.intake).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-neutral-400">{key}:</span>{" "}
                    <span className="text-white">
                      {Array.isArray(value) ? value.join(", ") : String(value || "—")}
                    </span>
                  </div>
                ))}
              </div>
              {profile.intakeComplete && (
                <div className="mt-2 text-xs text-emerald-300">✓ Intake marked complete</div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600/20 text-blue-100 border border-blue-500/30"
                    : "bg-neutral-800 text-neutral-200 border border-neutral-700"
                }`}
              >
                <div className="text-xs text-neutral-500 mb-1">
                  {msg.role === "user" ? "User" : "Assistant"}
                  {msg.createdAt && (
                    <span className="ml-2">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
