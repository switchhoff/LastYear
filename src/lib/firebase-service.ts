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
  userEmail?: string;
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
const ensureMemoryDocExists = (memoryDate: Date, sentence: string) => {
  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);

  const memoryData = {
    id: memoryId,
    date: memoryDate.toISOString().split('T')[0], // YYYY-MM-DD format
    sentence: sentence,
    aiArtUrl: "https://picsum.photos/seed/placeholder/600/400", // Placeholder URL
    reactions: [],
    chatMessages: [],
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
      // If the memory doesn't exist, create it first. This is a blocking call.
      const memoryData = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: [],
        chatMessages: [],
      };
      await setDoc(memoryRef, memoryData);
    }
    
    // Now perform the reaction update
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
  
  try {
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) {
      // If the memory doesn't exist, create it first.
      const memoryData = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: [],
        chatMessages: [],
      };
      await setDoc(memoryRef, memoryData);
    }

    const newMessage: ChatMessage = {
      userId: user.uid,
      userEmail: user.email || 'Anonymous',
      text,
      timestamp: new Date(), // Use client-side timestamp for array
    };
    
    const memoryData = (memorySnap.data() as Memory) || { chatMessages: [] };
    const existingMessages = memoryData.chatMessages || [];
    const newMessages = [...existingMessages, newMessage].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());

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
