"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getAnalyticsData } from "@/lib/admin/queries";
import { TIER_LABELS } from "@/lib/subscription";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

type FunnelData = {
  ok: boolean;
  days: number;
  totalUsers: number;
  tierBreakdown: { tier1: number; tier2: number; tier3: number };
  onboardingRate: number;
  events: Record<string, number>;
  conversionRates: Record<string, number>;
  dailySignups: { date: string; count: number }[];
  dailyUpgrades: { date: string; count: number }[];
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-panel rounded-2xl px-6 py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function TierBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-white font-semibold">{value} <span className="text-slate-500 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FunnelStep({ label, value, prevValue, color }: { label: string; value: number; prevValue?: number; color: string }) {
  const dropoff = prevValue && prevValue > 0 ? Math.round(((prevValue - value) / prevValue) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-300">{label}</span>
          <span className="text-sm font-semibold text-white">{value}</span>
        </div>
        {prevValue !== undefined && dropoff > 0 && (
          <p className="text-xs text-red-400 mt-0.5">↓ {dropoff}% drop-off</p>
        )}
      </div>
    </div>
  );
}

function ConversionRate({ label, rate }: { label: string; rate: number }) {
  const color = rate >= 50 ? "text-emerald-400" : rate >= 25 ? "text-amber-400" : "text-red-400";
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{rate}%</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const analyticsData = await getAnalyticsData();
        setData(analyticsData);
        
        // Load funnel data
        if (user) {
          const token = await user.getIdToken();
          const funnelRes = await fetch("/api/admin/funnel?days=30", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (funnelRes.ok) {
            const funnelData = await funnelRes.json();
            setFunnel(funnelData);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (error) return (
    <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
  );

  return (
    <div className="space-y-8">
      <div className="text-xl font-semibold text-white">Analytics & Business Intelligence</div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading analytics...</p>
      ) : data && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Users" value={data.users.total} />
            <StatCard label="Active Subscriptions" value={data.users.byStatus.active} sub={`${data.users.byStatus.canceled} canceled`} />
            <StatCard label="PDF Downloads" value={data.pdfs.total} sub="All time" />
            <StatCard label="Contact Inquiries" value={data.contacts.total} sub="All time" />
          </div>

          {/* Conversion Funnel */}
          {funnel && (
            <div className="glass-panel rounded-2xl px-6 py-6 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-white">Conversion Funnel</h3>
                <span className="text-xs text-slate-500">Last {funnel.days} days</span>
              </div>
              
              {/* Funnel Steps */}
              <div className="space-y-3 border-l-2 border-white/10 pl-4">
                <FunnelStep 
                  label="Signups" 
                  value={funnel.events.signup_completed || 0} 
                  color="bg-blue-400"
                />
                <FunnelStep 
                  label="Onboarding Completed" 
                  value={funnel.events.onboarding_completed || 0}
                  prevValue={funnel.events.signup_completed}
                  color="bg-cyan-400"
                />
                <FunnelStep 
                  label="First Image Uploaded" 
                  value={funnel.events.first_image_uploaded || 0}
                  prevValue={funnel.events.onboarding_completed}
                  color="bg-emerald-400"
                />
                <FunnelStep 
                  label="Pricing Page Viewed" 
                  value={funnel.events.pricing_page_viewed || 0}
                  prevValue={funnel.events.first_image_uploaded}
                  color="bg-amber-400"
                />
                <FunnelStep 
                  label="Checkout Started" 
                  value={funnel.events.checkout_started || 0}
                  prevValue={funnel.events.pricing_page_viewed}
                  color="bg-orange-400"
                />
                <FunnelStep 
                  label="Payment Completed" 
                  value={funnel.events.checkout_completed || 0}
                  prevValue={funnel.events.checkout_started}
                  color="bg-green-500"
                />
              </div>

              {/* Conversion Rates */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Key Conversion Rates</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <ConversionRate label="Signup → Onboarding" rate={funnel.conversionRates.signup_to_onboarding || 0} />
                  <ConversionRate label="Signup → First Image" rate={funnel.conversionRates.signup_to_first_image || 0} />
                  <ConversionRate label="Pricing → Checkout" rate={funnel.conversionRates.pricing_to_checkout || 0} />
                  <ConversionRate label="Checkout → Paid" rate={funnel.conversionRates.checkout_completion || 0} />
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tier Breakdown */}
          <div className="glass-panel rounded-2xl px-6 py-6 space-y-5">
            <h3 className="text-base font-semibold text-white">Subscription Tier Breakdown</h3>
            <div className="space-y-4">
              <TierBar label={TIER_LABELS.tier1} value={data.users.byTier.tier1} total={data.users.total} color="bg-slate-400" />
              <TierBar label={TIER_LABELS.tier2} value={data.users.byTier.tier2} total={data.users.total} color="bg-emerald-400" />
              <TierBar label={TIER_LABELS.tier3} value={data.users.byTier.tier3} total={data.users.total} color="bg-emerald-600" />
            </div>
          </div>

          {/* Subscription Health */}
          <div className="glass-panel rounded-2xl px-6 py-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Subscription Health</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Active", value: data.users.byStatus.active, color: "text-emerald-400" },
                { label: "Past Due", value: data.users.byStatus.past_due, color: "text-amber-400" },
                { label: "Canceled", value: data.users.byStatus.canceled, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 px-4 py-4">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Downloads by Tier */}
          <div className="glass-panel rounded-2xl px-6 py-6 space-y-5">
            <h3 className="text-base font-semibold text-white">PDF EPK Downloads by Tier</h3>
            <div className="space-y-4">
              <TierBar label="Tier I (Basic)" value={data.pdfs.byTier.tier1 || 0} total={data.pdfs.total || 1} color="bg-slate-400" />
              <TierBar label="Tier II (Enhanced)" value={data.pdfs.byTier.tier2 || 0} total={data.pdfs.total || 1} color="bg-emerald-400" />
              <TierBar label="Tier III (Branded)" value={data.pdfs.byTier.tier3 || 0} total={data.pdfs.total || 1} color="bg-emerald-600" />
            </div>

            {/* Recent PDF downloads */}
            {data.pdfs.recent.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Recent Downloads</p>
                <div className="space-y-2">
                  {data.pdfs.recent.map((pdf: Record<string, unknown>, i: number) => (
                    <div key={String(pdf.id ?? i)} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 text-sm">
                      <span className="text-slate-300">{String(pdf.artistName ?? pdf.uid ?? "Unknown")}</span>
                      <span className="text-xs text-slate-500">
                        {String(pdf.tier ?? "tier1").replace("tier", "Tier ")} •{" "}
                        {pdf.generatedAt ? new Date((pdf.generatedAt as { toDate?: () => Date })?.toDate?.() ?? String(pdf.generatedAt)).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Chat Usage */}
          <div className="glass-panel rounded-2xl px-6 py-6">
            <h3 className="text-base font-semibold text-white mb-2">AI Chat Usage</h3>
            <p className="text-2xl font-bold text-emerald-400">{data.chat.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total chat sessions logged</p>
          </div>
        </>
      )}
    </div>
  );
}
