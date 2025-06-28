
'use client';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDoc = doc(db, 'settings', 'api');

export const apiKeyService = {
  setApiKey: async (key: string): Promise<void> => {
    await setDoc(settingsDoc, { geminiApiKey: key });
  },

  getApiKey: async (): Promise<string | null> => {
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
        return docSnap.data().geminiApiKey;
    }
    // Set a default if it doesn't exist
    await setDoc(settingsDoc, { geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE' });
    return 'YOUR_GEMINI_API_KEY_HERE';
  },
};
