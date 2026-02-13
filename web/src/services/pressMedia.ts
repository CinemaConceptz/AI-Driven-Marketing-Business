import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import type { User } from "firebase/auth";

import { db, storage } from "@/lib/firebase";

export type PressMediaDoc = {
  title: string;
  caption: string;
  tags: string[];
  sortOrder: number;
  createdAt: any;
  updatedAt?: any;
  width: number;
  height: number;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  sizeBytes: number;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_W = 1000;
const MAX_H = 1000;

function getExtFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error("Could not read image dimensions"));
        img.src = url;
      }
    );
    return dims;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getPressMedia(uid: string): Promise<PressMediaDoc | null> {
  const pressRef = doc(db, "users", uid, "media", "press");
  const snap = await getDoc(pressRef);
  return snap.exists() ? (snap.data() as PressMediaDoc) : null;
}

export async function uploadPressImage(
  file: File,
  user: User
): Promise<PressMediaDoc> {
  if (!user?.uid) throw new Error("Not authenticated");
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Invalid file type. Only JPG, PNG, or WEBP allowed.");
  }

  const { width, height } = await getImageDimensions(file);
  if (width > MAX_W || height > MAX_H) {
    throw new Error(`Image too large. Max dimensions are ${MAX_W}×${MAX_H}px.`);
  }

  const uid = user.uid;
  const ext = getExtFromMime(file.type);
  const storagePath = `users/${uid}/media/press-image.${ext}`;

  const storageRef = ref(storage, storagePath);
  const uploadRes = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const downloadURL = await getDownloadURL(storageRef);

  const pressDoc: PressMediaDoc = {
    title: "Press Image",
    caption: "",
    tags: [],
    sortOrder: 0,
    createdAt: serverTimestamp(),
    width,
    height,
    storagePath,
    downloadURL,
    contentType: file.type,
    sizeBytes: uploadRes.metadata.size ?? file.size,
  };

  const pressRef = doc(db, "users", uid, "media", "press");
  await setDoc(pressRef, pressDoc, { merge: true });

  const snap = await getDoc(pressRef);
  return snap.data() as PressMediaDoc;
}

export async function deletePressImage(uid: string): Promise<void> {
  if (!uid) throw new Error("Missing uid");

  const pressRef = doc(db, "users", uid, "media", "press");
  const snap = await getDoc(pressRef);

  if (snap.exists()) {
    const data = snap.data() as Partial<PressMediaDoc>;
    const storagePath = data.storagePath;

    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (error: any) {
        if (error?.code !== "storage/object-not-found") throw error;
      }
    }

    await deleteDoc(pressRef);
  }
}
