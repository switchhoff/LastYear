
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  Timestamp,
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

const { firestore: db } = initializeFirebase();

export type Feedback = {
  journal?: string;
  reaction?: string;
  date: Date;
  yearAgoDate: Date;
  sentence: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  timestamp: Timestamp;
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

export function saveReaction(
  userId: string,
  memoryDate: Date,
  reaction: string | null
) {
  if (!userId) return;
  const memoryId = getMemoryDocId(memoryDate);
  const reactionRef = doc(db, 'users', userId, 'memories', memoryId, 'reactions', userId);
  setDocumentNonBlocking(reactionRef, { userId, reaction }, { merge: true });
}

export function addChatMessage(
  userId:string,
  userEmail: string,
  memoryDate: Date,
  text: string
) {
  if (!userId) return;
  const memoryId = getMemoryDocId(memoryDate);
  const chatCollectionRef = collection(
    db,
    'users',
    userId,
    'memories',
    memoryId,
    'chat_messages'
  );
  addDocumentNonBlocking(chatCollectionRef, {
    userId,
    userEmail,
    text,
    timestamp: serverTimestamp(),
  });
}

export async function getMemoryReactions(
  userId: string,
  memoryDate: Date
): Promise<{ success: boolean; reactions?: UserReaction[]; error?: string }> {
  if (!userId) return { success: true, reactions: [] };
  try {
    const memoryId = getMemoryDocId(memoryDate);
    const reactionsRef = collection(db, 'users', userId, 'memories', memoryId, 'reactions');
    const q = query(reactionsRef, where('reaction', '!=', null));
    const querySnapshot = await getDocs(q);
    const reactions = querySnapshot.docs.map(
      (doc) => doc.data() as UserReaction
    );
    return { success: true, reactions };
  } catch (error) {
    const memoryId = getMemoryDocId(memoryDate);
    const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/memories/${memoryId}/reactions`,
    })
    errorEmitter.emit('permission-error', contextualError);
    return { success: false, error: contextualError.message };
  }
}

export const getChatMessagesQuery = (userId: string, memoryDate: Date) => {
  if (!userId) return null;
  const memoryId = getMemoryDocId(memoryDate);
  const chatCollectionRef = collection(
    db,
    'users',
    userId,
    'memories',
    memoryId,
    'chat_messages'
  );
  return query(chatCollectionRef, orderBy('timestamp', 'asc'));
};

export const getMemoryReactionsForDate = async (
  userId: string,
  date: Date
): Promise<UserReaction[]> => {
  const result = await getMemoryReactions(userId, date);
  if (result.success && result.reactions) {
    return result.reactions;
  }
  return [];
};
