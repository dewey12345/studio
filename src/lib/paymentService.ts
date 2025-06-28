
'use client';
import type { PaymentSettings } from './types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDoc = doc(db, 'settings', 'payment');

const defaultSettings: PaymentSettings = {
    qrCodeUrl: 'https://placehold.co/300x300.png',
    telegramUrl: 'https://t.me/your-telegram-username'
};

export const paymentService = {
  setPaymentSettings: async (settings: PaymentSettings): Promise<void> => {
    await setDoc(settingsDoc, settings);
  },

  getPaymentSettings: async (): Promise<PaymentSettings> => {
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
        return docSnap.data() as PaymentSettings;
    }
    // Set default settings if they don't exist
    await setDoc(settingsDoc, defaultSettings);
    return defaultSettings;
  },
};
