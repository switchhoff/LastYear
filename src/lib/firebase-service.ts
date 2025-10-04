
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
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
    
    if (memorySnap.exists()) {
      // Document exists, update the reactions array.
      let reactions = memorySnap.data().reactions || [];
      // Remove existing reaction from the user
      reactions = reactions.filter((r: UserReaction) => r.userId !== user.uid);
      // Add new reaction if one was provided
      if (reaction) {
        reactions.push({ userId: user.uid, reaction });
      }
      await updateDoc(memoryRef, { reactions });
    } else {
      // Document does not exist, create it.
      const newReactions = reaction ? [{ userId: user.uid, reaction }] : [];
      const newMemory: Memory = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: newReactions,
        chatMessages: [],
      };
      await setDoc(memoryRef, newMemory);
    }
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

    if (memorySnap.exists()) {
      // The document exists, so we just update the chatMessages array.
      await updateDoc(memoryRef, {
        chatMessages: arrayUnion(newMessage)
      });
    } else {
      // The document does not exist, so we create it.
      const newMemory: Memory = {
        id: memoryId,
        date: memoryDate.toISOString().split('T')[0],
        sentence: sentence,
        aiArtUrl: "https://picsum.photos/seed/placeholder/600/400",
        reactions: [],
        chatMessages: [newMessage],
      };
      await setDoc(memoryRef, newMemory);
    }
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
      operation: 'get',
      path: `memories/${memoryId}`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return []; // Return empty array on error
  }
}
