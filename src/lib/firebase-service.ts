
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initializeFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { User } from 'firebase/auth';

const { firestore: db } = initializeFirebase();

export type ChatMessage = {
  userId: string;
  userName: string;
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
    let memoryData: Memory;

    if (memorySnap.exists()) {
      memoryData = memorySnap.data() as Memory;
    } else {
      // If doc doesn't exist, create the base structure
      memoryData = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: [],
        chatMessages: [],
      };
    }

    // Update reactions
    const existingReactions = memoryData.reactions || [];
    const newReactions = existingReactions.filter(r => r.userId !== user.uid);
    if (reaction) {
      newReactions.push({ userId: user.uid, reaction });
    }
    memoryData.reactions = newReactions;

    // Use setDoc to either create or overwrite the document
    await setDoc(memoryRef, memoryData);

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
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const userName = userSnap.exists() ? userSnap.data().userName : (user.displayName || user.email?.split('@')[0] || 'Anonymous');

    const newMessage: ChatMessage = {
      userId: user.uid,
      userName: userName,
      text,
      timestamp: serverTimestamp(),
    };

    const memorySnap = await getDoc(memoryRef);
    let memoryData: Memory;

    if (memorySnap.exists()) {
      memoryData = memorySnap.data() as Memory;
    } else {
      // If doc doesn't exist, create the base structure
      memoryData = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: [],
        chatMessages: [],
      };
    }
    
    // Add the new message
    const existingMessages = memoryData.chatMessages || [];
    memoryData.chatMessages = [...existingMessages, newMessage];

    // Use setDoc to either create or overwrite the document
    await setDoc(memoryRef, memoryData);

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
  try {
    const memoryId = getMemoryDocId(memoryDate);
    const memoryRef = doc(db, 'memories', memoryId);
    const docSnap = await getDoc(memoryRef);
    if (docSnap.exists()) {
      return (docSnap.data() as Memory)?.reactions || [];
    }
    return [];
  } catch (error) {
    const memoryId = getMemoryDocId(memoryDate);
    const contextualError = new FirestorePermissionError({
      operation: 'get', // Changed from list as we are getting a doc
      path: `memories/${memoryId}`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return []; // Return empty array on error
  }
}
