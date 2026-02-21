"use client";

import { normalizeTier, TIER_LABELS, type SubscriptionTier } from "@/lib/subscription";

type FeatureRow = {
  label: string;
  tier1: string | boolean;
  tier2: string | boolean;
  tier3: string | boolean;
};

const FEATURES: FeatureRow[] = [
  { label: "EPK hosting",             tier1: true,      tier2: true,       tier3: true },
  { label: "Press images",            tier1: "Up to 3",  tier2: "Up to 5", tier3: "Up to 10" },
  { label: "PDF EPK download",        tier1: "Basic",   tier2: "Enhanced", tier3: "Branded" },
  { label: "A&R review",             tier1: "Standard", tier2: "Priority", tier3: "Priority" },
  { label: "Strategy call",          tier1: false,     tier2: "Monthly",  tier3: "Monthly" },
  { label: "Direct A&R feedback",    tier1: false,     tier2: true,       tier3: true },
  { label: "Analytics dashboard",    tier1: false,     tier2: true,       tier3: true },
  { label: "Dedicated A&R contact",  tier1: false,     tier2: false,      tier3: true },
  { label: "Label showcases",        tier1: false,     tier2: false,      tier3: "Quarterly" },
  { label: "Custom campaign",        tier1: false,     tier2: false,      tier3: true },
  { label: "24/7 priority support",  tier1: false,     tier2: false,      tier3: true },
];

type Props = { rawTier?: string | null; status?: string | null };

function Cell({ value, isUser }: { value: string | boolean; isUser: boolean }) {
  const base = isUser ? "font-semibold text-emerald-400" : "text-slate-400";
  if (value === false)
    return <span className={`text-slate-600 ${isUser ? "text-slate-500" : ""}`}>—</span>;
  if (value === true)
    return <span className={base}>✓</span>;
  return <span className={base}>{value}</span>;
}

export default function FeatureAccessGrid({ rawTier, status }: Props) {
  const tier = normalizeTier(rawTier);
  const tiers: SubscriptionTier[] = ["tier1", "tier2", "tier3"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="py-3 text-left text-xs uppercase tracking-widest text-slate-500 font-medium">Feature</th>
            {tiers.map((t) => (
              <th key={t} className={`py-3 text-center text-xs uppercase tracking-widest font-medium ${t === tier ? "text-emerald-400" : "text-slate-500"}`}>
                {TIER_LABELS[t]}
                {t === tier && <span className="ml-1 text-[10px]">← you</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((row) => (
            <tr key={row.label} className="border-b border-white/5">
              <td className="py-3 text-slate-300">{row.label}</td>
              {tiers.map((t) => (
                <td key={t} className="py-3 text-center">
                  <Cell value={row[t]} isUser={t === tier} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
