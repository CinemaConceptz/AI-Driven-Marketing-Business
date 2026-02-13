import Link from "next/link";
import type { PressMediaDoc } from "@/services/pressMedia";

type Props = {
  pressMedia: PressMediaDoc | null;
};

export default function EpkPressImage({ pressMedia }: Props) {
  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-press-image">
      <h2
        className="text-xl font-semibold text-white"
        data-testid="epk-press-image-title"
      >
        Press Image
      </h2>
      {pressMedia?.downloadURL ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src={pressMedia.downloadURL}
            alt={pressMedia.title || "Press image"}
            className="h-48 w-48 rounded-2xl border border-white/10 object-cover"
            data-testid="epk-press-image-thumb"
          />
          <div className="text-sm text-slate-200">
            <p className="font-semibold text-white">
              {pressMedia.title || "Press Image"}
            </p>
            <p className="mt-2" data-testid="epk-press-image-caption">
              {pressMedia.caption || "No caption provided yet."}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mt-4 rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-8 text-sm text-slate-200"
          data-testid="epk-press-image-empty"
        >
          <p>No press image yet. Upload one in Media.</p>
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
