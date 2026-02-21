"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { EpkProfile, SubscriptionTier, AudioTrack } from "@/components/epk/types";

type Props = {
  profile: EpkProfile | null;
  tier: SubscriptionTier;
};

export default function EpkMusic({ profile, tier }: Props) {
  const tracks = profile?.audioTracks || [];
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const isPremium = tier === "tier3";

  const togglePlay = async (track: AudioTrack) => {
    const audioEl = audioRefs.current[track.id];
    if (!audioEl) return;
    try {
      if (playingTrackId === track.id) {
        audioEl.pause();
        setPlayingTrackId(null);
      } else {
        Object.entries(audioRefs.current).forEach(([id, el]) => {
          if (el && id !== track.id) el.pause();
        });
        await audioEl.play();
        setPlayingTrackId(track.id);
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const handleAudioEnded = (trackId: string) => {
    if (playingTrackId === trackId) setPlayingTrackId(null);
  };

  const spotifyLink = profile?.links?.spotify;
  const appleMusicLink = profile?.links?.appleMusic;
  const soundcloudLink = profile?.links?.soundcloud;
  const bandcampLink = profile?.links?.bandcamp;

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${isPremium ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" : "glass-panel"}`}
      data-testid="epk-music"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-semibold text-white ${isPremium ? "text-2xl" : "text-xl"}`} data-testid="epk-music-title">
          {isPremium ? "Featured Music & Discography" : "Music"}
        </h2>
        {isPremium && tracks.length > 0 && (
          <span className="text-xs text-amber-400 font-medium">{tracks.length} Track{tracks.length !== 1 ? "s" : ""} Available</span>
        )}
      </div>

      {(spotifyLink || appleMusicLink || soundcloudLink || bandcampLink) && (
        <div className="mb-6 pb-6 border-b border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Listen on Major Platforms</p>
          <div className="flex flex-wrap gap-2">
            {spotifyLink && (
              <a href={spotifyLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 px-4 py-2 text-xs font-semibold text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </a>
            )}
            {appleMusicLink && (
              <a href={appleMusicLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/30 px-4 py-2 text-xs font-semibold text-[#FA243C] hover:bg-[#FA243C]/30 transition-colors">
                Apple Music
              </a>
            )}
            {soundcloudLink && (
              <a href={soundcloudLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/30 px-4 py-2 text-xs font-semibold text-[#FF5500] hover:bg-[#FF5500]/30 transition-colors">
                SoundCloud
              </a>
            )}
            {bandcampLink && (
              <a href={bandcampLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#629aa9]/20 border border-[#629aa9]/30 px-4 py-2 text-xs font-semibold text-[#629aa9] hover:bg-[#629aa9]/30 transition-colors">
                Bandcamp
              </a>
            )}
          </div>
        </div>
      )}

      {tracks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Featured Tracks</p>
          {tracks.map((track, index) => (
            <div key={track.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                playingTrackId === track.id 
                  ? isPremium ? "bg-amber-500/10 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
              data-testid={`epk-track-${track.id}`}>
              <span className="text-slate-500 text-sm font-mono w-6">{String(index + 1).padStart(2, "0")}</span>
              <button onClick={() => togglePlay(track)}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  playingTrackId === track.id
                    ? isPremium ? "bg-amber-500 text-black" : "bg-emerald-500 text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                data-testid={`epk-play-${track.id}`}>
                {playingTrackId === track.id ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${playingTrackId === track.id ? (isPremium ? "text-amber-400" : "text-emerald-400") : "text-white"}`}>
                  {track.name}
                </p>
                <p className="text-xs text-slate-500">
                  {playingTrackId === track.id ? (
                    <span className={isPremium ? "text-amber-400/70" : "text-emerald-400/70"}>Now Playing</span>
                  ) : `Added ${new Date(track.uploadedAt).toLocaleDateString()}`}
                </p>
              </div>
              <audio ref={(el) => { audioRefs.current[track.id] = el; }} src={track.url} preload="metadata" onEnded={() => handleAudioEnded(track.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-8 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-sm text-slate-300 mb-2">Showcase your music directly in your EPK</p>
          <p className="text-xs text-slate-500 mb-4">Upload tracks to let A&R reps and industry professionals hear your sound</p>
          <Link href="/media" className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isPremium ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}>
            Upload Music
          </Link>
        </div>
      )}
    </section>
  );
}
