
'use client';
import { PAYMENT_SETTINGS_KEY } from './constants';
import type { PaymentSettings } from './types';

const defaultSettings: PaymentSettings = {
    qrCodeUrl: 'https://placehold.co/300x300.png',
    telegramUrl: 'https://t.me/your-telegram-username'
};

export const paymentService = {
  setPaymentSettings: (settings: PaymentSettings): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PAYMENT_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('storage'));
  },

  getPaymentSettings: (): PaymentSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    const settingsJson = localStorage.getItem(PAYMENT_SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : defaultSettings;
  },
};
