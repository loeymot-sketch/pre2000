import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
// @ts-expect-error - getReactNativePersistence exists at runtime but not in TS types for firebase 12.x
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);

// 1. Auth with React Native Persistence
// @ts-ignore - getReactNativePersistence exists in firebase/auth for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// 2. Firestore Persistence
// React Native usually enables persistence by default, but we can be explicit.
// Note: initializeFirestore should be called before getFirestore
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

export { auth };

// 3. Analytics
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
