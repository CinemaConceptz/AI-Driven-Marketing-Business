"use client";

import { useEffect, useState } from "react";
import { getPressMedia, type PressMediaDoc } from "@/services/pressMedia";

type Props = {
  uid: string;
  size?: number;
};

export default function PressImageThumb({ uid, size = 160 }: Props) {
  const [media, setMedia] = useState<PressMediaDoc | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const doc = await getPressMedia(uid);
      if (alive) setMedia(doc);
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!media?.downloadURL) return null;

  return (
    <img
      src={media.downloadURL}
      alt="Press"
      style={{ width: size, height: size }}
      className="rounded-xl border border-white/10 object-cover"
      data-testid="press-image-thumb"
    />
  );
}
