import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initializeFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { User } from 'firebase/auth';

const { firestore: db } = initializeFirebase();

export type ChatMessage = {
  // Messages won't have a unique ID when they are part of an array
  userId: string;
  userName?: string;
  text: string;
  timestamp: any; // Allow Timestamp or ServerTimestamp
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
    chatMessages?: ChatMessage[];
}

const getMemoryDocId = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

// Helper to ensure the parent memory document exists.
const ensureMemoryDocExists = async (memoryDate: Date, sentence: string) => {
  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);

  try {
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) {
      const memoryData = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0], // YYYY-MM-DD format
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400", // Placeholder URL
        reactions: [],
        chatMessages: [],
      };
      // This needs to be a blocking call to ensure the doc exists before proceeding.
      await setDoc(memoryRef, memoryData);
    }
  } catch (error) {
     const contextualError = new FirestorePermissionError({
      operation: 'write',
      path: memoryRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
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
    // Ensure the memory document exists before trying to update it.
    await ensureMemoryDocExists(memoryDate, sentence);
    
    // Now perform the reaction update
    const memorySnap = await getDoc(memoryRef);
    const memoryData = (memorySnap.data() as Memory) || { reactions: [] };

    const existingReactions = memoryData.reactions || [];
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

export async function addChatMessage(
  user: User,
  memoryDate: Date,
  sentence: string,
  text: string
) {
  if (!user) return;

  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);
  const userRef = doc(db, 'users', user.uid);

  try {
    // Ensure the memory document exists before trying to update it.
    await ensureMemoryDocExists(memoryDate, sentence);
    
    const userSnap = await getDoc(userRef);
    const userName = userSnap.exists() ? userSnap.data().userName : user.email?.split('@')[0];

    const newMessage: Omit<ChatMessage, 'timestamp'> & { timestamp: any } = {
      userId: user.uid,
      userName: userName || 'Anonymous',
      text,
      timestamp: serverTimestamp(), // Use server timestamp for ordering
    };
    
    const memorySnap = await getDoc(memoryRef);
    const memoryData = (memorySnap.data() as Memory) || { chatMessages: [] };
    const existingMessages = memoryData.chatMessages || [];

    // Note: serverTimestamp() will be null on the client. Sorting needs to happen on the client
    // after fetching, or by querying with orderBy if they were a subcollection.
    // For simplicity, we'll just add it. The sorting on display might be client-side.
    const newMessages = [...existingMessages, newMessage];

    updateDocumentNonBlocking(memoryRef, { chatMessages: newMessages });

  } catch (error) {
    const contextualError = new FirestorePermissionError({
      operation: 'write',
      path: memoryRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

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
