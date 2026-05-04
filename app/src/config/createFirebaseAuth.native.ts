import type { FirebaseApp } from 'firebase/app';
import { initializeAuth, type Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

type FirebaseAuthWithRn = typeof import('firebase/auth') & {
  getReactNativePersistence: (
    storage: typeof ReactNativeAsyncStorage
  ) => import('firebase/auth').Persistence;
};

export function createFirebaseAuth(app: FirebaseApp): Auth {
  const { getReactNativePersistence } = require('firebase/auth') as FirebaseAuthWithRn;
  return initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}
