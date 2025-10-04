
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DatedSentence } from './daily-content';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export type UserReaction = {
  userId: string;
  reaction: string;
};

export type UserMemoryChatMessage = {
  userId: string;
  userName: string;
  text: string;
};

export type Memory = {
    id: string;
    date: string;
    userSentences: { [key: string]: string };
    reactions: UserReaction[];
    chatMessages?: UserMemoryChatMessage[];
}

export const getMemoryDocId = (date: Date): string => {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${year}-${month}-${day}`;
};

export async function saveUserSentence(
  firestore: Firestore,
  user: User,
  date: Date,
  sentence: string
) {
  if (!user) return;

  const memoryId = getMemoryDocId(date);
  const memoryRef = doc(firestore, 'memories', memoryId);

  // Use dot notation to update a specific field in the map
  const dataToUpdate = { 
    [`userSentences.${user.uid}`]: sentence 
  };
  
  try {
     // Use setDoc with merge to create the doc if it doesn't exist,
     // or update just the user's sentence field.
    await setDoc(memoryRef, dataToUpdate, { merge: true });

  } catch (error) {
     const contextualError = new FirestorePermissionError({
      operation: 'write',
      path: memoryRef.path,
      requestResourceData: dataToUpdate
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

export async function saveReaction(
  firestore: Firestore,
  user: User,
  memoryDate: Date,
  reaction: string | null
) {
  if (!user) return;

  const memoryId = getMemoryDocId(new Date(memoryDate));
  const memoryRef = doc(firestore, 'memories', memoryId);

  try {
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) {
      console.error("Attempted to react to a memory document that doesn't exist:", memoryId);
      return;
    }
    
    let reactions: UserReaction[] = memorySnap.data().reactions || [];
    
    // Remove previous reaction from the user
    reactions = reactions.filter((r: UserReaction) => r.userId !== user.uid);
    
    // Add new reaction if one was provided
    if (reaction) {
      reactions.push({ userId: user.uid, reaction });
    }

    await updateDoc(memoryRef, { reactions });

  } catch (error) {
     const contextualError = new FirestorePermissionError({
      operation: 'update',
      path: memoryRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

export async function addChatMessage(
  firestore: Firestore,
  user: User,
  memoryDate: Date,
  text: string
) {
  if (!user || !text.trim()) return;

  const memoryId = getMemoryDocId(new Date(memoryDate));
  const memoryRef = doc(firestore, 'memories', memoryId);

  try {
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userName = userDocSnap.exists() ? userDocSnap.data().userName : 'Anonymous';

    const newMessage: UserMemoryChatMessage = {
      userId: user.uid,
      userName: userName,
      text: text,
    };
    
    await updateDoc(memoryRef, {
      chatMessages: arrayUnion(newMessage)
    });
    
  } catch (error) {
    console.error("Error adding chat message:", error);
    const contextualError = new FirestorePermissionError({
      operation: 'update',
      path: memoryRef.path,
      requestResourceData: { chatMessages: `arrayUnion({ userId: ${user.uid}, text: ${text} })`}
    });
    errorEmitter.emit('permission-error', contextualError);
  }
}

/**
 * Ensures that a Firestore document exists for every sentence in daily-content.
 * This is idempotent and can be called safely on every app load.
 */
export async function ensureMemoryDocuments(firestore: Firestore, allSentences: DatedSentence[]): Promise<void> {
    try {
        const batch = writeBatch(firestore);
        
        for (const sentence of allSentences) {
            const memoryId = getMemoryDocId(sentence.date);
            const memoryRef = doc(firestore, 'memories', memoryId);
            
            // For existing docs, we'll merge the new data structure.
            // For new docs, we'll create them with the new structure.
            const newMemoryData = {
                id: memoryId,
                date: sentence.date.toISOString().split('T')[0],
                userSentences: {
                    [ALEX_USER_ID]: sentence.sentence,
                },
                reactions: [],
                chatMessages: [],
            };
            batch.set(memoryRef, newMemoryData, { merge: true });
        }
        
        await batch.commit();
    } catch (error) {
        console.error("Error ensuring memory documents:", error);
    }
}


// Hardcoded user IDs for legacy data.
const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
