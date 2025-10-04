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
import { initializeFirebase } from '@/firebase';

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

export async function saveReaction(
  userId: string,
  memoryDate: Date,
  reaction: string | null
) {
  try {
    const memoryId = getMemoryDocId(memoryDate);
    const reactionRef = doc(db, 'memories', memoryId, 'reactions', userId);
    setDocumentNonBlocking(reactionRef, { userId, reaction }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving reaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function addChatMessage(
  userId: string,
  userEmail: string,
  memoryDate: Date,
  text: string
) {
  try {
    const memoryId = getMemoryDocId(memoryDate);
    const chatCollectionRef = collection(
      db,
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
    return { success: true };
  } catch (error) {
    console.error('Error adding chat message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function getMemoryReactions(
  memoryDate: Date
): Promise<{ success: boolean; reactions?: UserReaction[]; error?: string }> {
  try {
    const memoryId = getMemoryDocId(memoryDate);
    const reactionsRef = collection(db, 'memories', memoryId, 'reactions');
    const q = query(reactionsRef, where('reaction', '!=', null));
    const querySnapshot = await getDocs(q);
    const reactions = querySnapshot.docs.map(
      (doc) => doc.data() as UserReaction
    );
    return { success: true, reactions };
  } catch (error) {
    console.error('Error getting reactions:', error);
    return { success: false, error: 'Could not fetch reactions.' };
  }
}

export const getChatMessagesQuery = (memoryDate: Date) => {
  const memoryId = getMemoryDocId(memoryDate);
  const chatCollectionRef = collection(
    db,
    'memories',
    memoryId,
    'chat_messages'
  );
  return query(chatCollectionRef, orderBy('timestamp', 'asc'));
};

export const getMemoryReactionsForDate = async (
  date: Date
): Promise<UserReaction[]> => {
  const result = await getMemoryReactions(date);
  if (result.success && result.reactions) {
    return result.reactions;
  }
  return [];
};
