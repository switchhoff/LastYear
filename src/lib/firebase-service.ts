import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  FieldValue,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export type UserReaction = {
  userId: string;
  reaction: string;
};

export type UserMemoryChatMessage = {
  userId: string;
  userName: string;
  text: string;
  timestamp: Date | Timestamp; // Can be a JS Date on client and Firestore Timestamp from server
};

export type Memory = {
    id: string;
    date: string;
    userSentences: { [key: string]: string };
    reactions: UserReaction[];
    chatMessages?: UserMemoryChatMessage[];
    lastRead?: { [key: string]: FieldValue };
    lastMessageTimestamp?: FieldValue;
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
    [`userSentences.${user.uid}`]: sentence,
  };

  getDoc(memoryRef).then(docSnap => {
    if (docSnap.exists()) {
        // Document exists, just update the sentence
        updateDoc(memoryRef, dataToUpdate)
        .catch((error) => {
             const contextualError = new FirestorePermissionError({
                operation: 'update',
                path: memoryRef.path,
                requestResourceData: dataToUpdate
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    } else {
        // Document doesn't exist, create it with all fields
        const createData: Memory = {
            id: memoryId,
            date: date.toISOString().split('T')[0],
            userSentences: {
                [user.uid]: sentence,
            },
            reactions: [],
            chatMessages: [], // Ensure this is initialized
            lastRead: {},      // Ensure this is initialized
        }
        setDoc(memoryRef, createData)
            .catch(setError => {
                 const contextualError = new FirestorePermissionError({
                    operation: 'create',
                    path: memoryRef.path,
                    requestResourceData: createData
                });
                errorEmitter.emit('permission-error', contextualError);
            })
    }
  }).catch(error => {
     const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: memoryRef.path,
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
    
    const currentReactions: UserReaction[] = memorySnap.data().reactions || [];
    
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

  const userName = user.displayName || 'Anonymous';

  const newMessage = {
    userId: user.uid,
    userName: userName,
    text: text,
    // Use a client-side JS Date object for the array.
    timestamp: new Date(), 
  };
  
  // Use serverTimestamp() on a separate top-level field.
  const dataToUpdate = {
    chatMessages: arrayUnion(newMessage),
    lastMessageTimestamp: serverTimestamp()
  };

  updateDoc(memoryRef, dataToUpdate)
  .catch(error => {
    const contextualError = new FirestorePermissionError({
      operation: 'update',
      path: memoryRef.path,
      requestResourceData: dataToUpdate
    });
    errorEmitter.emit('permission-error', contextualError);
  });
}

export function markChatAsRead(firestore: Firestore, user: User, memoryDate: Date) {
  if (!user) return;
  const memoryId = getMemoryDocId(new Date(memoryDate));
  const memoryRef = doc(firestore, 'memories', memoryId);

  const dataToUpdate = {
    [`lastRead.${user.uid}`]: serverTimestamp(),
  };

  updateDoc(memoryRef, dataToUpdate).catch((error) => {
    const contextualError = new FirestorePermissionError({
      operation: 'update',
      path: memoryRef.path,
      requestResourceData: dataToUpdate,
    });
    errorEmitter.emit('permission-error', contextualError);
  });
}


// Hardcoded user IDs for legacy data.
export const ALEX_USER_ID = '1xcBSDAluySuyeLwX5TEQnuiPMA2';
export const AMALIE_USER_ID = 'SFsKmCQM9NZi7Drmsb4pNBtLJ6m1';
