import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export function getFirebaseAuth(firebaseConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}
