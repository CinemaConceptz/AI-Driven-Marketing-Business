"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

type EmailSequence = {
  id: string;
  name: string;
  priority: string;
  metrics: {
    sent: number;
    failed: number;
    total: number;
  };
  successRate: number;
};

type EmailMetricsData = {
  ok: boolean;
  days: number;
  summary: {
    totalSent: number;
    totalFailed: number;
    successRate: number;
    unsubscribes: number;
    bounces: number;
    spamComplaints: number;
  };
  sequences: EmailSequence[];
};

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P0: "bg-red-500/20 text-red-300",
    P1: "bg-amber-500/20 text-amber-300",
    P2: "bg-blue-500/20 text-blue-300",
    P3: "bg-slate-500/20 text-slate-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[priority] || colors.P3}`}>
      {priority}
    </span>
  );
}

function SequenceRow({ sequence }: { sequence: EmailSequence }) {
  const successColor = sequence.successRate >= 90 
    ? "text-emerald-400" 
    : sequence.successRate >= 70 
    ? "text-amber-400" 
    : "text-red-400";

  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <PriorityBadge priority={sequence.priority} />
        <span className="text-sm text-white">{sequence.name}</span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-slate-400">
          <span className="text-white">{sequence.metrics.sent}</span> sent
        </div>
        {sequence.metrics.failed > 0 && (
          <div className="text-red-400">
            {sequence.metrics.failed} failed
          </div>
        )}
        <div className={`font-medium ${successColor}`}>
          {sequence.successRate}%
        </div>
      </div>
    </div>
  );
}

export default function EmailRetentionDashboard() {
  const [data, setData] = useState<EmailMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/email-metrics?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch email metrics");
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load email metrics");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading email metrics...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-slate-400 text-sm">No email data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Email Retention</h2>
          <p className="text-sm text-slate-400">Last {data.days} days</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel rounded-xl px-4 py-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.summary.totalSent}</p>
          <p className="text-xs text-slate-400 mt-1">Emails Sent</p>
        </div>
        <div className="glass-panel rounded-xl px-4 py-4 text-center">
          <p className="text-2xl font-bold text-white">{data.summary.successRate}%</p>
          <p className="text-xs text-slate-400 mt-1">Delivery Rate</p>
        </div>
        <div className="glass-panel rounded-xl px-4 py-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{data.summary.unsubscribes}</p>
          <p className="text-xs text-slate-400 mt-1">Unsubscribes</p>
        </div>
        <div className="glass-panel rounded-xl px-4 py-4 text-center">
          <p className="text-2xl font-bold text-red-400">
            {data.summary.bounces + data.summary.spamComplaints}
          </p>
          <p className="text-xs text-slate-400 mt-1">Bounces/Spam</p>
        </div>
      </div>

      {/* Health Indicators */}
      {(data.summary.unsubscribes > 10 || data.summary.spamComplaints > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200">
            <strong>Attention:</strong> 
            {data.summary.spamComplaints > 0 && ` ${data.summary.spamComplaints} spam complaints detected.`}
            {data.summary.unsubscribes > 10 && ` High unsubscribe rate (${data.summary.unsubscribes}).`}
            {" "}Consider reviewing email frequency and content.
          </p>
        </div>
      )}

      {/* Sequence Performance */}
      <div className="glass-panel rounded-2xl px-6 py-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Email Sequence Performance</h3>
        <div className="space-y-2">
          {data.sequences
            .filter(s => s.metrics.total > 0)
            .sort((a, b) => {
              const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
              return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                     (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
            })
            .map((sequence) => (
              <SequenceRow key={sequence.id} sequence={sequence} />
            ))
          }
          {data.sequences.filter(s => s.metrics.total > 0).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              No emails sent in this period
            </p>
          )}
        </div>
      </div>

      {/* Compliance Status */}
      <div className="glass-panel rounded-2xl px-6 py-6">
        <h3 className="text-base font-semibold text-white mb-4">Compliance Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-300">Unsubscribe links active</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-300">Bounce handling enabled</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-300">Spam complaint tracking</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-300">Email preferences honored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
