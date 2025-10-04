import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initializeFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { User } from 'firebase/auth';

const { firestore: db } = initializeFirebase();

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  timestamp: any; // Allow Timestamp or ServerTimestamp
  userEmail?: string;
};

export type UserReaction = {
  userId: string;
  reaction: string;
};

export type Memory = {
    id: string;
    date: string;
    sentence: string;
    aiArtUrl: string;
    reactions: UserReaction[];
}

const getMemoryDocId = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

// Helper to ensure the parent memory document exists before writing to a subcollection.
const ensureMemoryDocExists = (memoryDate: Date, sentence: string) => {
  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);

  const memoryData = {
    id: memoryId,
    date: memoryDate.toISOString().split('T')[0], // YYYY-MM-DD format
    sentence: sentence,
    aiArtUrl: "https://picsum.photos/seed/placeholder/600/400", // Placeholder URL
    reactions: [], // Initialize with an empty array
  };

  // Use a non-blocking set with merge. This will create the doc if it doesn't exist,
  // or update it if it does, without overwriting fields unnecessarily.
  setDocumentNonBlocking(memoryRef, memoryData, { merge: true });
};

export async function saveReaction(
  user: User,
  memoryDate: Date,
  sentence: string,
  reaction: string | null
) {
  if (!user) return;

  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);

  try {
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) {
      // If the memory doesn't exist, create it first.
      ensureMemoryDocExists(memoryDate, sentence);
    }
    
    // Remove any existing reaction from this user
    // Firestore doesn't have a great way to update an element in an array,
    // so we have to read the doc, modify the array, and write it back.
    // For this app's scale, this is fine. For larger apps, a subcollection is better.
    const memoryData = memorySnap.data() as Memory | undefined;
    const existingReactions = memoryData?.reactions || [];
    const newReactions = existingReactions.filter(r => r.userId !== user.uid);

    if (reaction) {
      newReactions.push({ userId: user.uid, reaction });
    }
    
    // Use a non-blocking update to set the new reactions array.
    updateDocumentNonBlocking(memoryRef, { reactions: newReactions });

  } catch (error) {
     const contextualError = new FirestorePermissionError({
      operation: 'write',
      path: memoryRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

export function addChatMessage(
  user: User,
  memoryDate: Date,
  sentence: string,
  text: string
) {
  if (!user) return;

  ensureMemoryDocExists(memoryDate, sentence);

  const memoryId = getMemoryDocId(memoryDate);
  const chatCollectionRef = collection(db, 'memories', memoryId, 'chat_messages');
  
  addDocumentNonBlocking(chatCollectionRef, {
    userId: user.uid,
    userEmail: user.email,
    text,
    timestamp: serverTimestamp(),
  });
}

export const getChatMessagesQuery = (memoryDate: Date) => {
  const memoryId = getMemoryDocId(memoryDate);
  const chatCollectionRef = collection(db, 'memories', memoryId, 'chat_messages');
  return query(chatCollectionRef, orderBy('timestamp', 'asc'));
};

// This function is no longer a query, it just gets a document.
// For consistency, we can have a query function for the document.
export const getMemoryDocRef = (memoryDate: Date) => {
  const memoryId = getMemoryDocId(memoryDate);
  return doc(db, 'memories', memoryId);
};


export async function getAllMemoryReactions(
  memoryDate: Date
): Promise<UserReaction[]> {
  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);
  try {
    const docSnap = await getDoc(memoryRef);
    if (docSnap.exists()) {
      return (docSnap.data() as Memory)?.reactions || [];
    }
    return [];
  } catch (error) {
    const contextualError = new FirestorePermissionError({
      operation: 'get',
      path: `memories/${memoryId}`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return []; // Return empty array on error
  }
}
