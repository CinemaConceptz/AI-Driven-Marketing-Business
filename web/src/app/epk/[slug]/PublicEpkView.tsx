"use client";

import { useState } from "react";

type PressMedia = {
  id: string;
  downloadURL: string;
  width: number;
  height: number;
  contentType: string;
  sizeBytes: number;
};

type Props = {
  userData: any;
  media: PressMedia[];
  slug: string;
};

export default function PublicEpkView({ userData, media, slug }: Props) {
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const artistName = userData?.artistName || userData?.displayName || "Artist";
  const bio = userData?.bio || "";
  const genre = userData?.genre || "";
  const location = userData?.location || "";
  const email = userData?.contactEmail || userData?.email || "";
  const links = userData?.links || {};

  const shareUrl = typeof window !== "undefined" 
    ? window.location.href 
    : `https://verifiedsoundar.com/epk/${slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" data-testid="public-epk">
      {/* Header */}
      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Electronic Press Kit
            </p>
            <h1 
              className="mt-2 text-4xl font-bold text-white"
              data-testid="epk-artist-name"
            >
              {artistName}
            </h1>
            {genre && (
              <p className="mt-2 text-lg text-emerald-400" data-testid="epk-genre">
                {genre}
              </p>
            )}
            {location && (
              <p className="mt-1 text-sm text-slate-400" data-testid="epk-location">
                📍 {location}
              </p>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
            data-testid="epk-share-btn"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share EPK
              </>
            )}
          </button>
        </div>
      </section>

      {/* Press Images */}
      {media.length > 0 && (
        <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-media-section">
          <h2 className="text-xl font-semibold text-white mb-4">Press Images</h2>
          
          {/* Main image */}
          <div className="relative mb-4">
            <img
              src={media[selectedImage]?.downloadURL}
              alt={`${artistName} press image`}
              className="w-full max-h-[500px] object-contain rounded-2xl border border-white/10"
              data-testid="epk-main-image"
            />
          </div>

          {/* Thumbnails */}
          {media.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {media.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`rounded-lg overflow-hidden transition-all ${
                    idx === selectedImage
                      ? "ring-2 ring-emerald-500"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  data-testid={`epk-thumb-${idx}`}
                >
                  <img
                    src={img.downloadURL}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-20 h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Download button */}
          <a
            href={media[selectedImage]?.downloadURL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
            data-testid="epk-download-btn"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Image
          </a>
        </section>
      )}

      {/* Bio */}
      {bio && (
        <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-bio-section">
          <h2 className="text-xl font-semibold text-white mb-4">About</h2>
          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {bio}
          </p>
        </section>
      )}

      {/* Links */}
      {Object.keys(links).length > 0 && (
        <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-links-section">
          <h2 className="text-xl font-semibold text-white mb-4">Links</h2>
          <div className="flex flex-wrap gap-3">
            {links.spotify && (
              <a
                href={links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 px-4 py-2 text-sm text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors"
              >
                Spotify
              </a>
            )}
            {links.soundcloud && (
              <a
                href={links.soundcloud}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/30 px-4 py-2 text-sm text-[#FF5500] hover:bg-[#FF5500]/30 transition-colors"
              >
                SoundCloud
              </a>
            )}
            {links.instagram && (
              <a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#E4405F]/20 border border-[#E4405F]/30 px-4 py-2 text-sm text-[#E4405F] hover:bg-[#E4405F]/30 transition-colors"
              >
                Instagram
              </a>
            )}
            {links.youtube && (
              <a
                href={links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF0000]/20 border border-[#FF0000]/30 px-4 py-2 text-sm text-[#FF0000] hover:bg-[#FF0000]/30 transition-colors"
              >
                YouTube
              </a>
            )}
            {links.website && (
              <a
                href={links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
              >
                Website
              </a>
            )}
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="glass-panel rounded-3xl px-8 py-10 text-center" data-testid="epk-contact-section">
        <h2 className="text-xl font-semibold text-white mb-2">Interested in working together?</h2>
        <p className="text-slate-400 mb-6">
          Get in touch to discuss collaborations, bookings, or representation.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {email && (
            <a
              href={`mailto:${email}?subject=Inquiry from EPK`}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              data-testid="epk-contact-btn"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Artist
            </a>
          )}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "Copied!" : "Copy EPK Link"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-500">
          Powered by{" "}
          <a href="/" className="text-emerald-500 hover:underline">
            Verified Sound A&R
          </a>
        </p>
      </div>
    </div>
  );
}
