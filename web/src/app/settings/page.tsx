"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import EpkSettingsPanel from "@/components/EpkSettingsPanel";

type UserProfile = {
  artistName?: string;
  displayName?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  bio?: string;
  genre?: string;
  location?: string;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [artistName, setArtistName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState({
    spotify: "",
    soundcloud: "",
    bandcamp: "",
    appleMusic: "",
    instagram: "",
    youtube: "",
    website: "",
  });

  // Load profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setArtistName(data.artistName || data.displayName || "");
          setContactEmail(data.contactEmail || data.email || "");
          setPhone(data.phone || "");
          setBio(data.bio || "");
          setGenre(data.genre || "");
          setLocation(data.location || "");
          setLinks({
            spotify: data.links?.spotify || "",
            soundcloud: data.links?.soundcloud || "",
            bandcamp: data.links?.bandcamp || "",
            appleMusic: data.links?.appleMusic || "",
            instagram: data.links?.instagram || "",
            youtube: data.links?.youtube || "",
            website: data.links?.website || "",
          });
        }
      } catch (err: any) {
        setError("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        artistName: artistName.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        genre: genre.trim(),
        location: location.trim(),
        links: {
          spotify: links.spotify.trim(),
          soundcloud: links.soundcloud.trim(),
          bandcamp: links.bandcamp.trim(),
          appleMusic: links.appleMusic.trim(),
          instagram: links.instagram.trim(),
          youtube: links.youtube.trim(),
          website: links.website.trim(),
        },
      });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200"
        data-testid="settings-login-required"
      >
        <p className="text-lg font-semibold text-white">Please log in</p>
        <p className="mt-2 text-sm text-slate-200">
          Settings are available after authentication.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
          data-testid="settings-login-button"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="glass-panel rounded-3xl px-8 py-10" data-testid="settings-page">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-3 text-sm text-slate-200">
          Manage your profile information and EPK settings.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="glass-panel rounded-3xl px-8 py-10 space-y-6">
        <h2 className="text-xl font-semibold text-white">Profile Information</h2>
        <p className="text-sm text-slate-400">
          This information will appear on your public EPK.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Artist Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Artist Name
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your artist/stage name"
              data-testid="settings-artist-name"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Public contact email"
              data-testid="settings-contact-email"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              placeholder="+1 (555) 123-4567"
              data-testid="settings-phone"
            />
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Genre
            </label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              placeholder="e.g., House, EDM, Techno"
              data-testid="settings-genre"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              placeholder="e.g., Los Angeles, CA"
              data-testid="settings-location"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
            placeholder="Tell your story..."
            data-testid="settings-bio"
          />
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Music & Social Links</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Spotify</label>
              <input
                type="url"
                value={links.spotify}
                onChange={(e) => setLinks({ ...links, spotify: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://open.spotify.com/artist/..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">SoundCloud</label>
              <input
                type="url"
                value={links.soundcloud}
                onChange={(e) => setLinks({ ...links, soundcloud: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://soundcloud.com/..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Bandcamp</label>
              <input
                type="url"
                value={links.bandcamp}
                onChange={(e) => setLinks({ ...links, bandcamp: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://yourname.bandcamp.com"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Apple Music</label>
              <input
                type="url"
                value={links.appleMusic}
                onChange={(e) => setLinks({ ...links, appleMusic: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://music.apple.com/artist/..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Instagram</label>
              <input
                type="url"
                value={links.instagram}
                onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">YouTube</label>
              <input
                type="url"
                value={links.youtube}
                onChange={(e) => setLinks({ ...links, youtube: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Website</label>
              <input
                type="url"
                value={links.website}
                onChange={(e) => setLinks({ ...links, website: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving || loadingProfile}
            className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
            data-testid="settings-save-btn"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* EPK Settings */}
      <EpkSettingsPanel user={user} />
    </div>
  );
}
