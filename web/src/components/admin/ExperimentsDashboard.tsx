"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

type Variant = "control" | "variant_a" | "variant_b";

type ExperimentMetrics = {
  variants: {
    id: Variant;
    views: number;
    conversions: number;
    conversionRate: number;
  }[];
  totalViews: number;
  totalConversions: number;
  winningVariant: Variant | null;
  statisticalSignificance: boolean;
};

type ExperimentsData = {
  ok: boolean;
  days: number;
  experiments: Record<string, ExperimentMetrics>;
};

const EXPERIMENT_NAMES: Record<string, string> = {
  pricing_headline: "Pricing Page Headline",
  upgrade_prompt_style: "Upgrade Prompt Style",
  paywall_messaging: "Paywall Messaging",
};

const VARIANT_NAMES: Record<string, Record<Variant, string>> = {
  pricing_headline: {
    control: "Choose Your Path to Label Success",
    variant_a: "Get Discovered by Top Labels",
    variant_b: "Your Music Deserves Label Attention",
  },
  upgrade_prompt_style: {
    control: "Banner (top)",
    variant_a: "Inline (contextual)",
    variant_b: "Banner (top)",
  },
  paywall_messaging: {
    control: "Value-focused",
    variant_a: "Urgency-focused",
    variant_b: "Value-focused",
  },
};

function VariantBar({ 
  variant, 
  experimentId,
  isWinning,
}: { 
  variant: ExperimentMetrics["variants"][0];
  experimentId: string;
  isWinning: boolean;
}) {
  const name = VARIANT_NAMES[experimentId]?.[variant.id] || variant.id;
  const barColor = isWinning ? "bg-emerald-500" : "bg-slate-500";
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-300">{name}</span>
          {isWinning && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              Leading
            </span>
          )}
        </div>
        <span className="font-medium text-white">{variant.conversionRate}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div 
          className={`h-2 rounded-full ${barColor} transition-all`} 
          style={{ width: `${Math.min(variant.conversionRate * 2, 100)}%` }} 
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{variant.views} views</span>
        <span>{variant.conversions} conversions</span>
      </div>
    </div>
  );
}

function ExperimentCard({ 
  experimentId, 
  metrics 
}: { 
  experimentId: string;
  metrics: ExperimentMetrics;
}) {
  const name = EXPERIMENT_NAMES[experimentId] || experimentId;
  
  return (
    <div className="glass-panel rounded-2xl px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{name}</h3>
        {metrics.statisticalSignificance ? (
          <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
            Significant
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
            Collecting data
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xl font-bold text-white">{metrics.totalViews}</p>
          <p className="text-xs text-slate-400">Total Views</p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xl font-bold text-emerald-400">{metrics.totalConversions}</p>
          <p className="text-xs text-slate-400">Conversions</p>
        </div>
      </div>
      
      <div className="space-y-4 pt-2 border-t border-white/10">
        <p className="text-xs uppercase tracking-widest text-slate-500">Variant Performance</p>
        {metrics.variants.map((variant) => (
          <VariantBar
            key={variant.id}
            variant={variant}
            experimentId={experimentId}
            isWinning={variant.id === metrics.winningVariant}
          />
        ))}
      </div>
    </div>
  );
}

export default function ExperimentsDashboard() {
  const [data, setData] = useState<ExperimentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/experiments?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch experiment data");
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load experiments");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">Loading experiments...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!data?.experiments) {
    return (
      <div className="text-slate-400 text-sm">No experiment data available.</div>
    );
  }

  const experimentIds = Object.keys(data.experiments);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">A/B Experiments</h2>
          <p className="text-sm text-slate-400">Last {data.days} days</p>
        </div>
        <div className="text-xs text-slate-500">
          Need 100+ views per variant for significance
        </div>
      </div>

      {experimentIds.length === 0 ? (
        <div className="glass-panel rounded-2xl px-6 py-10 text-center">
          <p className="text-slate-400">No active experiments</p>
          <p className="text-sm text-slate-500 mt-2">
            Experiments will appear here once they start collecting data.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {experimentIds.map((id) => (
            <ExperimentCard
              key={id}
              experimentId={id}
              metrics={data.experiments[id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
