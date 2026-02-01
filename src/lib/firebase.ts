import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, Timestamp } from "firebase-admin/firestore";

let app: App | null = null;
let firestore: Firestore | null = null;

// Lazy initialization of Firebase - only runs when first DB call is made
function getApp(): App {
  if (!app) {
    if (getApps().length) {
      app = getApps()[0];
    } else {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
  return app;
}

function getDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getApp());
  }
  return firestore;
}

// User document type
export interface UserDoc {
  email: string;
  walletAddress: string | null;
  totpSecret: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// Helper functions
export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  const db = getDb();
  const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserDoc;
}

export async function getUserByWallet(walletAddress: string): Promise<UserDoc | null> {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .where("walletAddress", "==", walletAddress.toLowerCase())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserDoc;
}

export async function createOrUpdateUser(
  email: string,
  data: Partial<Omit<UserDoc, "email" | "createdAt">>
): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
  const now = Timestamp.now();

  if (snapshot.empty) {
    // Create new user
    await db.collection("users").add({
      email,
      walletAddress: null,
      totpSecret: null,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
  } else {
    // Update existing user
    await snapshot.docs[0].ref.update({
      ...data,
      updatedAt: now,
    });
  }
}
