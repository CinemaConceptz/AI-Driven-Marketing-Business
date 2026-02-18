import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdmin";
import PublicEpkView from "./PublicEpkView";

type Props = {
  params: Promise<{ slug: string }>;
};

// Fetch user data by slug (slug = uid for now, can be customized later)
async function getEpkData(slug: string) {
  try {
    // First, try to find user by slug field
    const usersRef = adminDb.collection("users");
    let userSnap = await usersRef.where("epkSlug", "==", slug).limit(1).get();
    
    let uid: string;
    let userData: any;
    
    if (!userSnap.empty) {
      const doc = userSnap.docs[0];
      uid = doc.id;
      userData = doc.data();
    } else {
      // Fallback: try slug as uid directly
      const directSnap = await usersRef.doc(slug).get();
      if (!directSnap.exists) {
        return null;
      }
      uid = slug;
      userData = directSnap.data();
    }

    // Check if EPK is published
    if (userData?.epkPublished === false) {
      return { uid, userData, published: false, media: [] };
    }

    // Fetch media
    const mediaSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("media")
      .orderBy("sortOrder", "asc")
      .get();

    const media = mediaSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as { downloadURL: string; width: number; height: number; contentType: string; sizeBytes: number }),
    }));

    return { uid, userData, published: true, media };
  } catch (error) {
    console.error("[epk/slug] Error fetching EPK data:", error);
    return null;
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEpkData(slug);

  if (!data || !data.published) {
    return {
      title: "EPK Not Found | Verified Sound A&R",
      description: "This Electronic Press Kit could not be found.",
    };
  }

  const { userData, media } = data;
  const artistName = userData?.artistName || userData?.displayName || "Artist";
  const bio = userData?.bio || `Electronic Press Kit for ${artistName}`;
  const genre = userData?.genre || "Electronic Music";
  
  // Use first press image as OG image, or fallback
  const ogImage = media?.[0]?.downloadURL || "/og-default.png";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verifiedsoundar.com";

  return {
    title: `${artistName} | EPK | Verified Sound A&R`,
    description: `${bio.slice(0, 155)}...`,
    keywords: [artistName, genre, "EPK", "Electronic Press Kit", "A&R", "Music"],
    openGraph: {
      title: `${artistName} - Electronic Press Kit`,
      description: bio.slice(0, 200),
      url: `${baseUrl}/epk/${slug}`,
      siteName: "Verified Sound A&R",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${artistName} Press Image`,
        },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${artistName} - EPK`,
      description: bio.slice(0, 200),
      images: [ogImage],
    },
  };
}

export default async function PublicEpkPage({ params }: Props) {
  const { slug } = await params;
  const data = await getEpkData(slug);

  if (!data) {
    notFound();
  }

  if (!data.published) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-center"
          data-testid="epk-not-published"
        >
          <h1 className="text-2xl font-semibold text-white">EPK Not Published</h1>
          <p className="mt-3 text-slate-200">
            This artist has not published their Electronic Press Kit yet.
          </p>
        </div>
      </div>
    );
  }

  return <PublicEpkView userData={data.userData} media={data.media} slug={slug} />;
}
