"use client";

import { useState } from "react";
import Link from "next/link";
import type { PressMediaDoc } from "@/services/pressMedia";
import type { SubscriptionTier } from "@/components/epk/types";
import { getImagePlaceholderCount } from "@/components/epk/EpkLayout";

type Props = {
  pressMedia: PressMediaDoc[];
  tier: SubscriptionTier;
};

export default function EpkPressImage({ pressMedia, tier }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = pressMedia[selectedIndex] || null;
  const imageCount = getImagePlaceholderCount(tier);
  const isPremium = tier === "tier3";
  const isPro = tier === "tier2" || tier === "tier3";
  const sectionTitle = isPremium ? "Official Press Photography" : isPro ? "Press Images" : "Press Photo";

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${isPremium ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" : "glass-panel"}`}
      data-testid="epk-press-image"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-semibold text-white ${isPremium ? "text-2xl" : "text-xl"}`} data-testid="epk-press-image-title">
          {sectionTitle}
        </h2>
        {isPremium && pressMedia.length > 0 && (
          <span className="text-xs text-amber-400 font-medium">High-Resolution Available</span>
        )}
      </div>

      {pressMedia.length > 0 ? (
        <div className="space-y-6">
          {isPremium ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pressMedia.slice(0, 3).map((img, index) => (
                <div key={img.id} className="relative group cursor-pointer" onClick={() => setSelectedIndex(index)}>
                  <img src={img.downloadURL} alt={`Press photo ${index + 1}`}
                    className={`w-full aspect-square rounded-xl object-cover transition-all ${index === selectedIndex ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900" : "opacity-80 hover:opacity-100"}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{img.width}×{img.height}</span>
                  </div>
                  {index === 0 && <span className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">PRIMARY</span>}
                </div>
              ))}
            </div>
          ) : isPro ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pressMedia.slice(0, 2).map((img, index) => (
                <div key={img.id} className="relative">
                  <img src={img.downloadURL} alt={`Press photo ${index + 1}`} className="w-full aspect-square rounded-xl object-cover border border-white/10" />
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-lg">{img.width}×{img.height}</div>
                  {index === 0 && <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">PRIMARY</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative max-w-md">
              <img src={selectedImage?.downloadURL} alt="Press image" className="w-full rounded-2xl border border-white/10 object-cover aspect-square" data-testid="epk-press-image-main" />
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">{selectedImage?.width}×{selectedImage?.height}</div>
            </div>
          )}

          {isPremium && (
            <div className="flex items-center justify-between text-sm text-slate-400 pt-4 border-t border-white/10">
              <p>All images available in original resolution for press use</p>
              <p className="text-amber-400">{pressMedia.length} image{pressMedia.length !== 1 ? "s" : ""}</p>
            </div>
          )}

          {!isPro && pressMedia.length > 1 && (
            <div className="flex gap-2 mt-4" data-testid="epk-press-image-thumbnails">
              {pressMedia.map((img, index) => (
                <button key={img.id} onClick={() => setSelectedIndex(index)}
                  className={`relative rounded-lg overflow-hidden transition-all ${index === selectedIndex ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#021024]" : "opacity-60 hover:opacity-100"}`}
                  data-testid={`epk-press-thumb-${index}`}>
                  <img src={img.downloadURL} alt={`Thumbnail ${index + 1}`} className="w-16 h-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-8" data-testid="epk-press-image-empty">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-300 mb-2">
              {isPremium ? "Upload up to 3 high-resolution press photos" : isPro ? "Upload up to 2 press photos" : "Upload your primary press photo"}
            </p>
            <p className="text-xs text-slate-500 mb-4">Professional imagery is essential for media coverage and playlist consideration</p>
            <Link href="/media" className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isPremium ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-white text-[#021024] hover:bg-slate-100"}`} data-testid="epk-press-image-upload-link">
              Upload Press Photos
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
