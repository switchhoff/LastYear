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

export function saveUserSentence(
  firestore: Firestore,
  user: User,
  date: Date,
  sentence: string
) {
  if (!user) return;

  const memoryId = getMemoryDocId(date);
  const memoryRef = doc(firestore, 'memories', memoryId);

  const dataToUpdate = {
    userSentences: {
      [user.uid]: sentence,
    },
    id: memoryId,
    date: date.toISOString().split('T')[0],
  };

  setDoc(memoryRef, dataToUpdate, { merge: true })
    .catch((error) => {
      const contextualError = new FirestorePermissionError({
        operation: 'write',
        path: memoryRef.path,
        requestResourceData: dataToUpdate
      });
      errorEmitter.emit('permission-error', contextualError);
  });
}

export function saveReaction(
  firestore: Firestore,
  user: User,
  memoryDate: Date,
  reaction: string | null
) {
  if (!user) return;

  const memoryId = getMemoryDocId(new Date(memoryDate));
  const memoryRef = doc(firestore, 'memories', memoryId);

  getDoc(memoryRef).then(memorySnap => {
    if (!memorySnap.exists()) {
      console.error("Attempted to react to a memory document that doesn't exist:", memoryId);
      return;
    }
    
    let currentReactions: UserReaction[] = memorySnap.data().reactions || [];
    
    // Remove previous reaction from the user
    const otherUserReactions = currentReactions.filter((r: UserReaction) => r.userId !== user.uid);
    
    const newReactions = reaction 
      ? [...otherUserReactions, { userId: user.uid, reaction }]
      : otherUserReactions;
      
    const dataToUpdate = { reactions: newReactions };
    updateDoc(memoryRef, dataToUpdate)
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          operation: 'update',
          path: memoryRef.path,
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }).catch(error => {
      const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: memoryRef.path,
      });
      errorEmitter.emit('permission-error', contextualError);
  });
}

export function addChatMessage(
  firestore: Firestore,
  user: User,
  memoryDate: Date,
  text: string
) {
  if (!user || !text.trim()) return;

  const memoryId = getMemoryDocId(new Date(memoryDate));
  const memoryRef = doc(firestore, 'memories', memoryId);
  const userDocRef = doc(firestore, 'users', user.uid);

  getDoc(userDocRef).then(userDocSnap => {
    const userName = userDocSnap.exists() ? userDocSnap.data().userName : 'Anonymous';

    const newMessage: UserMemoryChatMessage = {
      userId: user.uid,
      userName: userName,
      text: text,
    };
    
    const dataToUpdate = {
      chatMessages: arrayUnion(newMessage)
    };

    updateDoc(memoryRef, dataToUpdate)
    .catch(error => {
      const contextualError = new FirestorePermissionError({
        operation: 'update',
        path: memoryRef.path,
        requestResourceData: { chatMessages: `arrayUnion(${JSON.stringify(newMessage)})`}
      });
      errorEmitter.emit('permission-error', contextualError);
    });
  }).catch(error => {
      const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: userDocRef.path,
      });
      errorEmitter.emit('permission-error', contextualError);
  });
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
export const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
export const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';
