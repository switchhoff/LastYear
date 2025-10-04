import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
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
  };

  // Use a non-blocking set with merge. This will create the doc if it doesn't exist,
  // or update it if it does, without overwriting fields unnecessarily.
  setDocumentNonBlocking(memoryRef, memoryData, { merge: true });
};

export function saveReaction(
  user: User,
  memoryDate: Date,
  sentence: string,
  reaction: string | null
) {
  if (!user) return;

  ensureMemoryDocExists(memoryDate, sentence);

  const memoryId = getMemoryDocId(memoryDate);
  // Each user has their own document in the reactions subcollection, identified by their UID.
  const reactionRef = doc(db, 'memories', memoryId, 'reactions', user.uid);
  
  // If the reaction is null, it means the user is removing their reaction.
  // We can just set an empty object or a specific field to indicate no reaction.
  // For simplicity, we'll save the reaction, and null will clear it in the UI logic.
  const dataToSave = { userId: user.uid, reaction };
  
  setDocumentNonBlocking(reactionRef, dataToSave, { merge: true });
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

export const getMemoryReactionsQuery = (memoryDate: Date) => {
  const memoryId = getMemoryDocId(memoryDate);
  const reactionsRef = collection(db, 'memories', memoryId, 'reactions');
  // Return the query itself to be used with useCollection
  return query(reactionsRef, where('reaction', '!=', null));
};

export async function getAllMemoryReactions(
  memoryDate: Date
): Promise<UserReaction[]> {
  try {
    const reactionsQuery = getMemoryReactionsQuery(memoryDate);
    const querySnapshot = await getDocs(reactionsQuery);
    const reactions = querySnapshot.docs.map(
      (doc) => doc.data() as UserReaction
    );
    return reactions;
  } catch (error) {
    const memoryId = getMemoryDocId(memoryDate);
    const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `memories/${memoryId}/reactions`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return []; // Return empty array on error
  }
}
