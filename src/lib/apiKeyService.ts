
'use client';
import { API_KEY_KEY } from './constants';

export const apiKeyService = {
  setApiKey: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(API_KEY_KEY, key);
  },

  getApiKey: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(API_KEY_KEY);
  },
};
