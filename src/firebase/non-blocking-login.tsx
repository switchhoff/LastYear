'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    // Although less common for anonymous sign-in, handle potential errors
    // like network issues or disabled anonymous auth provider.
    console.error('Anonymous sign-in error:', error);
    // You could potentially emit a generic auth error here if needed.
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    // This is where auth errors like 'auth/email-already-in-use' will be caught.
    // We are not creating a specific FirestorePermissionError here because
    // these are auth errors, not Firestore rules errors.
    // A general error toast is more appropriate, handled on the login page itself.
    console.error('Email sign-up error:', error);
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((error) => {
    // Catches 'auth/user-not-found', 'auth/wrong-password', etc.
    console.error('Email sign-in error:', error);
  });
}
