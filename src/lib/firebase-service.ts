
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { initializeFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { User } from 'firebase/auth';
import type { DatedSentence } from './daily-content';

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
  reaction: string | null
) {
  if (!user) return;

  const memoryId = getMemoryDocId(memoryDate);
  const memoryRef = doc(db, 'memories', memoryId);

  try {
    const memorySnap = await getDoc(memoryRef);
    
    if (memorySnap.exists()) {
      let reactions = memorySnap.data().reactions || [];
      reactions = reactions.filter((r: UserReaction) => r.userId !== user.uid);
      if (reaction) {
        reactions.push({ userId: user.uid, reaction });
      }
      await updateDoc(memoryRef, { reactions });
    }
  } catch (error) {
     const contextualError = new FirestorePermissionError({
      operation: 'update',
      path: memoryRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

export async function addChatMessage(
  user: User,
  memoryDate: Date,
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

    await updateDoc(memoryRef, {
      chatMessages: arrayUnion(newMessage)
    });
    
  } catch (error) {
    const contextualError = new FirestorePermissionError({
      operation: 'update',
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

/**
 * Ensures that a Firestore document exists for every sentence in daily-content.
 * This is idempotent and can be called safely on every app load.
 */
export async function ensureMemoryDocuments(firestore: Firestore, allSentences: DatedSentence[]): Promise<void> {
    try {
        const batch = writeBatch(firestore);
        
        // We can't perform a get() in a batch, so we fetch all existing documents first.
        // For larger apps, this could be optimized, but for a year's worth of data it's fine.
        const existingDocsPromises = allSentences.map(sentence => {
            const memoryId = getMemoryDocId(sentence.date);
            const memoryRef = doc(firestore, 'memories', memoryId);
            return getDoc(memoryRef);
        });

        const existingDocsSnapshots = await Promise.all(existingDocsPromises);

        for (let i = 0; i < allSentences.length; i++) {
            const sentence = allSentences[i];
            const docSnapshot = existingDocsSnapshots[i];

            // If the document does not exist, add it to the batch to be created.
            if (!docSnapshot.exists()) {
                const memoryId = getMemoryDocId(sentence.date);
                const memoryRef = doc(firestore, 'memories', memoryId);
                const newMemory: Memory = {
                    id: memoryId,
                    date: sentence.date.toISOString().split('T')[0],
                    sentence: sentence.sentence,
                    aiArtUrl: "https://picsum.photos/seed/placeholder/600/400", // Default placeholder
                    reactions: [],
                    chatMessages: [],
                };
                batch.set(memoryRef, newMemory);
            }
        }
        
        // Commit the batch to create all missing documents at once.
        await batch.commit();
    } catch (error) {
        console.error("Error ensuring memory documents:", error);
         // This is a background task, so we'll just log the error.
         // A specific error could be emitted here if needed.
    }
}
