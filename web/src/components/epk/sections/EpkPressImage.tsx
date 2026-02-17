"use client";

import { useState } from "react";
import Link from "next/link";
import type { PressMediaDoc } from "@/services/pressMedia";

type Props = {
  pressMedia: PressMediaDoc[];
};

export default function EpkPressImage({ pressMedia }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = pressMedia[selectedIndex] || null;

  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-press-image">
      <h2
        className="text-xl font-semibold text-white"
        data-testid="epk-press-image-title"
      >
        Press Images
      </h2>
      
      {pressMedia.length > 0 ? (
        <div className="mt-4 space-y-4">
          {/* Main selected image */}
          <div className="relative">
            <img
              src={selectedImage?.downloadURL}
              alt={`Press image ${selectedIndex + 1}`}
              className="w-full max-w-md rounded-2xl border border-white/10 object-cover aspect-square"
              data-testid="epk-press-image-main"
            />
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
              {selectedImage?.width}×{selectedImage?.height}
            </div>
          </div>

          {/* Thumbnail gallery (if more than 1 image) */}
          {pressMedia.length > 1 && (
            <div className="flex gap-2" data-testid="epk-press-image-thumbnails">
              {pressMedia.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    index === selectedIndex
                      ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#021024]"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  data-testid={`epk-press-thumb-${index}`}
                >
                  <img
                    src={img.downloadURL}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-16 h-16 object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-0.5 left-0.5 bg-emerald-600 text-white text-[8px] px-1 rounded">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Image count */}
          <p className="text-sm text-slate-400">
            {pressMedia.length} image{pressMedia.length !== 1 ? "s" : ""} • Click thumbnails to preview
          </p>
        </div>
      ) : (
        <div
          className="mt-4 rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-8 text-sm text-slate-200"
          data-testid="epk-press-image-empty"
        >
          <p>No press images yet. Upload up to 3 in Media.</p>
          <Link
            href="/media"
            className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
            data-testid="epk-press-image-upload-link"
          >
            Go to Media
          </Link>
        </div>
      )}
    </section>
  );
}
