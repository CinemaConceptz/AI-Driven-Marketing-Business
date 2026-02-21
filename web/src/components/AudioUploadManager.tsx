"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { db, storage } from "@/lib/firebase";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

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

  // Play/Pause toggle
  const togglePlay = async (track: AudioTrack) => {
    const audioEl = audioRefs.current[track.id];
    if (!audioEl) return;

    try {
      if (playingTrackId === track.id) {
        audioEl.pause();
        setPlayingTrackId(null);
      } else {
        // Pause any other playing track
        Object.entries(audioRefs.current).forEach(([id, el]) => {
          if (el && id !== track.id) {
            el.pause();
          }
        });
        
        await audioEl.play();
        setPlayingTrackId(track.id);
      }
    } catch (err: any) {
      console.error("Playback error:", err);
      setError(`Playback failed: ${err.message || "Unable to play audio"}`);
    }
  };

  // Handle audio ended
  const handleAudioEnded = (trackId: string) => {
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
    }
  };

  // Handle file upload
  const handleUpload = async (file: File) => {
    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"];
    if (!validTypes.includes(file.type)) {
      setError("Only MP3 and WAV files are allowed");
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be under 50MB");
      return;
    }

    // Check track limit
    if (tracks.length >= maxTracks) {
      setError(`Maximum ${maxTracks} tracks allowed. Delete one to upload another.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique ID
      const trackId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const storagePath = `users/${user.uid}/audio/${trackId}.${extension}`;
      
      // Upload to Firebase Storage
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
          // Get download URL
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // Create track entry
          const newTrack: AudioTrack = {
            id: trackId,
            name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
            url: downloadUrl,
            uploadedAt: new Date().toISOString(),
          };

          // Update Firestore
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Delete track
  const handleDelete = async (track: AudioTrack) => {
    if (!confirm(`Delete "${track.name}"?`)) return;

    setError(null);
    setSuccess(null);

    // Stop if playing
    if (playingTrackId === track.id) {
      const audioEl = audioRefs.current[track.id];
      if (audioEl) audioEl.pause();
      setPlayingTrackId(null);
    }

    try {
      // Delete from Storage
      const storagePath = `users/${user.uid}/audio/${track.id}.${track.url.includes(".wav") ? "wav" : "mp3"}`;
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch {
        // File might not exist, continue with Firestore update
      }

      // Update Firestore
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
        <h3 className="text-lg font-semibold text-white">Audio Tracks</h3>
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
      <div className="space-y-3">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
            data-testid={`audio-track-${track.id}`}
          >
            {/* Play/Pause Button */}
            <button
              onClick={() => togglePlay(track)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors"
              data-testid={`play-track-${track.id}`}
            >
              {playingTrackId === track.id ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{track.name}</p>
              <p className="text-xs text-slate-400">
                {playingTrackId === track.id ? (
                  <span className="text-emerald-400">Now Playing</span>
                ) : (
                  `Uploaded ${new Date(track.uploadedAt).toLocaleDateString()}`
                )}
              </p>
            </div>

            {/* Hidden Audio Element */}
            <audio
              ref={(el) => { audioRefs.current[track.id] = el; }}
              src={track.url}
              preload="metadata"
              crossOrigin="anonymous"
              onEnded={() => handleAudioEnded(track.id)}
              onError={(e) => {
                const audioEl = e.target as HTMLAudioElement;
                console.error("Audio error:", audioEl.error?.message || "Unknown error");
                setError(`Failed to load "${track.name}". The audio file may not be accessible.`);
              }}
              onCanPlay={() => {
                // Clear any previous errors when audio is ready
                if (error?.includes(track.name)) {
                  setError(null);
                }
              }}
            />

            {/* Delete Button */}
            <button
              onClick={() => handleDelete(track)}
              className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete track"
              data-testid={`delete-track-${track.id}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}

        {/* Empty State */}
        {tracks.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p>No tracks uploaded yet</p>
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
              className="w-full rounded-xl border-2 border-dashed border-white/20 py-6 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-white transition-colors"
              data-testid="audio-upload-button"
            >
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Click to upload audio ({tracks.length}/{maxTracks})
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
