"use client";

import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { db, storage } from "@/lib/firebase";
import { Play, Pause, Trash2, Music, Upload, Volume2 } from "lucide-react";

type Props = {
  user: User;
  maxTracks?: number;
};

type AudioTrack = {
  id: string;
  name: string;
  url: string;
  duration?: number;
  uploadedAt: string;
};

export default function AudioUploadManager({ user, maxTracks = 2 }: Props) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Record<string, number>>({});
  const [duration, setDuration] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Load existing tracks
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setTracks(data.audioTracks || []);
        }
      } catch (err: any) {
        setError("Failed to load tracks");
      } finally {
        setLoading(false);
      }
    };
    loadTracks();
  }, [user.uid]);

  // Handle play/pause
  const togglePlay = (trackId: string) => {
    const audio = audioRefs.current[trackId];
    if (!audio) return;

    if (playingTrackId === trackId) {
      audio.pause();
      setPlayingTrackId(null);
    } else {
      // Pause any currently playing track
      if (playingTrackId && audioRefs.current[playingTrackId]) {
        audioRefs.current[playingTrackId]?.pause();
      }
      audio.play();
      setPlayingTrackId(trackId);
    }
  };

  // Handle time update
  const handleTimeUpdate = (trackId: string, audio: HTMLAudioElement) => {
    setCurrentTime((prev) => ({ ...prev, [trackId]: audio.currentTime }));
  };

  // Handle loaded metadata
  const handleLoadedMetadata = (trackId: string, audio: HTMLAudioElement) => {
    setDuration((prev) => ({ ...prev, [trackId]: audio.duration }));
  };

  // Handle track ended
  const handleEnded = (trackId: string) => {
    setPlayingTrackId(null);
    setCurrentTime((prev) => ({ ...prev, [trackId]: 0 }));
  };

  // Seek to position
  const handleSeek = (trackId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs.current[trackId];
    if (!audio || !duration[trackId]) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration[trackId];
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle file upload
  const handleUpload = async (file: File) => {
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"];
    if (!validTypes.includes(file.type)) {
      setError("Only MP3 and WAV files are allowed");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be under 50MB");
      return;
    }

    if (tracks.length >= maxTracks) {
      setError(`Maximum ${maxTracks} tracks allowed. Delete one to upload another.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const trackId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const storagePath = `users/${user.uid}/audio/${trackId}.${extension}`;

      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          setError(error.message || "Upload failed");
          setUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          const newTrack: AudioTrack = {
            id: trackId,
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: downloadUrl,
            uploadedAt: new Date().toISOString(),
          };

          const userRef = doc(db, "users", user.uid);
          const updatedTracks = [...tracks, newTrack];
          await updateDoc(userRef, {
            audioTracks: updatedTracks,
          });

          setTracks(updatedTracks);
          setSuccess("Track uploaded successfully!");
          setUploading(false);
          setUploadProgress(0);
          setTimeout(() => setSuccess(null), 3000);
        }
      );
    } catch (err: any) {
      setError(err?.message || "Upload failed");
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (track: AudioTrack) => {
    if (!confirm(`Delete "${track.name}"?`)) return;

    setError(null);
    setSuccess(null);

    // Stop if playing
    if (playingTrackId === track.id) {
      audioRefs.current[track.id]?.pause();
      setPlayingTrackId(null);
    }

    try {
      const storagePath = `users/${user.uid}/audio/${track.id}.${track.url.includes(".wav") ? "wav" : "mp3"}`;
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch {
        // File might not exist
      }

      const userRef = doc(db, "users", user.uid);
      const updatedTracks = tracks.filter((t) => t.id !== track.id);
      await updateDoc(userRef, {
        audioTracks: updatedTracks,
      });

      setTracks(updatedTracks);
      setSuccess("Track deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete track");
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl px-6 py-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-32 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-48"></div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl px-6 py-6 space-y-6" data-testid="audio-upload-manager">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          Audio Tracks
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Upload your best {maxTracks} tracks (MP3 or WAV, max 50MB each)
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Track List */}
      <div className="space-y-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
            data-testid={`audio-track-${track.id}`}
          >
            {/* Hidden audio element */}
            <audio
              ref={(el) => {
                audioRefs.current[track.id] = el;
              }}
              src={track.url}
              preload="metadata"
              onTimeUpdate={(e) => handleTimeUpdate(track.id, e.currentTarget)}
              onLoadedMetadata={(e) => handleLoadedMetadata(track.id, e.currentTarget)}
              onEnded={() => handleEnded(track.id)}
            />

            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={() => togglePlay(track.id)}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  playingTrackId === track.id
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                }`}
              >
                {playingTrackId === track.id ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Track Info & Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-white truncate">{track.name}</p>
                  <button
                    onClick={() => handleDelete(track)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete track"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div
                  className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => handleSeek(track.id, e)}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${
                        duration[track.id]
                          ? ((currentTime[track.id] || 0) / duration[track.id]) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Time Display */}
                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                  <span>{formatTime(currentTime[track.id] || 0)}</span>
                  <span>{formatTime(duration[track.id] || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {tracks.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tracks uploaded yet</p>
            <p className="text-sm text-slate-500 mt-1">Upload your music to include in your EPK</p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {tracks.length < maxTracks && (
        <div className="pt-4 border-t border-white/10">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="audio-file-input"
          />

          {uploading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Uploading...</span>
                <span className="text-emerald-400">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-white/20 py-6 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-white transition-colors flex flex-col items-center gap-2"
              data-testid="audio-upload-button"
            >
              <Upload className="w-8 h-8 opacity-50" />
              <span>Click to upload audio ({tracks.length}/{maxTracks})</span>
              <span className="text-xs text-slate-500">MP3 or WAV, max 50MB</span>
            </button>
          )}
        </div>
      )}

      {/* Max Tracks Reached */}
      {tracks.length >= maxTracks && (
        <p className="text-xs text-slate-500 text-center">
          Maximum {maxTracks} tracks reached. Delete one to upload another.
        </p>
      )}
    </div>
  );
}
