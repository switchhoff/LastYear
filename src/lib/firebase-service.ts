import { app } from './firebase';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

export type Feedback = {
  journal?: string;
  reaction?: string;
  date: Date;
  yearAgoDate: Date;
  sentence: string;
};

const db = getFirestore(app);

// We use the date of the memory (the "year ago" date) as the unique ID for the document.
const getDocIdForDate = (date: Date): string => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

export async function saveFeedback(feedback: {
  date: Date; // The date the user is viewing (e.g., today)
  yearAgoDate: Date; // The date of the memory
  sentence: string;
  journal?: string;
  reaction?: string;
}) {
  try {
    const docId = getDocIdForDate(feedback.yearAgoDate);
    const docRef = doc(db, 'memories', docId);

    // We use setDoc with merge: true to create or update the document
    // without overwriting existing fields we don't want to change.
    await setDoc(
      docRef,
      {
        date: Timestamp.fromDate(feedback.date),
        yearAgoDate: Timestamp.fromDate(feedback.yearAgoDate),
        sentence: feedback.sentence,
        ...(feedback.journal !== undefined && { journal: feedback.journal }),
        ...(feedback.reaction !== undefined && { reaction: feedback.reaction }),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function getFeedback(
  yearAgoDate: Date
): Promise<{ success: boolean; data?: Feedback; error?: string }> {
  try {
    const docId = getDocIdForDate(yearAgoDate);
    const docRef = doc(db, 'memories', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        success: true,
        data: {
          journal: data.journal,
          reaction: data.reaction,
          // Convert Firestore Timestamps back to JS Dates
          date: (data.date as Timestamp).toDate(),
          yearAgoDate: (data.yearAgoDate as Timestamp).toDate(),
          sentence: data.sentence,
        },
      };
    } else {
      return { success: true, data: undefined }; // No feedback found is not an error
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}
