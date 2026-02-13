import type { PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile } from "@/components/epk/types";
import EpkHeader from "@/components/epk/sections/EpkHeader";
import EpkPressImage from "@/components/epk/sections/EpkPressImage";
import EpkBio from "@/components/epk/sections/EpkBio";
import EpkContact from "@/components/epk/sections/EpkContact";

type Props = {
  profile: EpkProfile | null;
  pressMedia: PressMediaDoc | null;
  uid: string;
};

export default function EpkLayout({ profile, pressMedia, uid }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <EpkHeader profile={profile} uid={uid} />
      <EpkPressImage pressMedia={pressMedia} />
      <EpkBio profile={profile} />
      <EpkContact profile={profile} />
    </div>
  );
}
