
'use client';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { GameSettings, RoundResult } from './types';

const settingsDoc = doc(db, 'settings', 'game');
const historyCollection = collection(db, 'round-history');

const defaultSettings: GameSettings = {
    difficulty: 'easy',
};

export const gameService = {
  setGameSettings: async (gSettings: GameSettings): Promise<void> => {
    await setDoc(settingsDoc, gSettings);
  },

  getGameSettings: async (): Promise<GameSettings> => {
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
        return docSnap.data() as GameSettings;
    }
    await setDoc(settingsDoc, defaultSettings);
    return defaultSettings;
  },

  addRoundToHistory: async (roundResult: RoundResult): Promise<void> => {
    await addDoc(historyCollection, roundResult);
  },

  getGlobalRoundHistory: async (max: number = 50): Promise<RoundResult[]> => {
    const q = query(historyCollection, orderBy('id', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RoundResult);
  }
};
