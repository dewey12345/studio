
// NOTE: This is a mock authentication service for demonstration purposes.
// It uses localStorage and is not secure for production environments.
'use client';

import { v4 as uuidv4 } from 'uuid';
import type { User } from './types';
import { USERS_KEY, CURRENT_USER_KEY } from './constants';
import { apiKeyService } from './apiKeyService';
import { paymentService } from './paymentService';

const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const usersJson = localStorage.getItem(USERS_KEY);
  if (usersJson) {
    return JSON.parse(usersJson);
  }
  // Create a default admin user if none exist
  const adminUser: User = { id: 'admin_user_01', email: 'imblaster2019@gmail.com', phone: '1234567890', password: 'password', role: 'admin', balance: 99999 };
  const regularUser: User = { id: 'regular_user_01', email: 'user@example.com', phone: '0987654321', password: 'password', role: 'user', balance: 1000 };
  localStorage.setItem(USERS_KEY, JSON.stringify([adminUser, regularUser]));
  
  // Also set a default API key if none exists
  if (!apiKeyService.getApiKey()) {
    apiKeyService.setApiKey('YOUR_GEMINI_API_KEY_HERE');
  }

  // Set default payment settings
  paymentService.getPaymentSettings();


  return [adminUser, regularUser];
};

const storeUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Dispatch a custom event to notify other components on the *same* page of auth change
  window.dispatchEvent(new CustomEvent('auth-change'));
};

const storeCurrentUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
        // Omit password before storing in current user session
        const { password, ...userToStore } = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
    // Dispatch a custom event to notify other components on the *same* page of auth change
    window.dispatchEvent(new CustomEvent('auth-change'));
};


export const authService = {
  register: (email: string, password_raw: string, phone?: string): User => {
    const users = getStoredUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('User with this email already exists.');
    }
    if (phone && users.find(u => u.phone === phone)) {
      throw new Error('User with this phone number already exists.');
    }
    const newUser: User = {
      id: uuidv4(),
      email,
      phone,
      password: password_raw, // In a real app, you would hash this
      role: 'user',
      balance: 1000, // Starting balance for new users
    };
    users.push(newUser);
    storeUsers(users);
    return newUser;
  },

  login: (credential: string, password_raw: string): User => {
    const users = getStoredUsers();
    const user = users.find(u => (u.email === credential || u.phone === credential));
    if (!user || user.password !== password_raw) { // In a real app, compare hashed passwords
      throw new Error('Invalid credentials or password.');
    }
    storeCurrentUser(user);
    return user;
  },

  logout: () => {
    storeCurrentUser(null);
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },
  
  getUsers: (withPassword = false): (User | Omit<User, 'password'>)[] => {
    const users = getStoredUsers();
    if (withPassword) {
        return users;
    }
    return users.map(({ password, ...user }) => user);
  },
  
  updateUser: (id: string, email: string, newPassword?: string) => {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error("User not found");
    }

    if (users.some(u => u.email === email && u.id !== id)) {
        throw new Error("Email is already in use by another account.");
    }

    const updatedUser = { ...users[userIndex], email };
    if (newPassword) {
        updatedUser.password = newPassword;
    }

    users[userIndex] = updatedUser;
    storeUsers(users);

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser(updatedUser);
    }
    
    return updatedUser;
  },

  updateUserByAdmin: (id: string, data: Partial<User>) => {
    let users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error("User not found");
    }
    
    if (data.email && users.some(u => u.email === data.email && u.id !== id)) {
      throw new Error("Email is already in use by another account.");
    }

    if (data.phone && users.some(u => u.phone === data.phone && u.id !== id)) {
      throw new Error("Phone number is already in use by another account.");
    }
    
    const updatedUser = { 
      ...users[userIndex], 
      ...data,
    };

    users[userIndex] = updatedUser;
    storeUsers(users);

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser(updatedUser);
    }

    return updatedUser;
  },

  updateBalance: (id: string, amount: number) => {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");

    const newBalance = users[userIndex].balance + amount;
    if (newBalance < 0) throw new Error("Insufficient funds.");
    
    users[userIndex].balance = newBalance;
    storeUsers(users);

    const currentUser = authService.getCurrentUser();
    if(currentUser && currentUser.id === id) {
      storeCurrentUser(users[userIndex]);
    }
    return users[userIndex];
  },
  
  updateMultipleUsers: (updatedUsers: User[]) => {
    let users = getStoredUsers();
    updatedUsers.forEach(updatedUser => {
        const userIndex = users.findIndex(u => u.id === updatedUser.id);
        if(userIndex !== -1) {
            users[userIndex] = updatedUser;
        }
    });
    storeUsers(users);
  },

  addUser: (data: Omit<User, 'id'>) => {
    let users = getStoredUsers();
    if (users.some(u => u.email === data.email)) {
      throw new Error("User with this email already exists.");
    }
    if (data.phone && users.some(u => u.phone === data.phone)) {
      throw new Error("User with this phone number already exists.");
    }
    const newUser: User = {
      id: uuidv4(),
      ...data
    };
    users.push(newUser);
    storeUsers(users);
    return newUser;
  },

  deleteUser: (id: string) => {
    let users = getStoredUsers();
    const newUsers = users.filter(u => u.id !== id);
    if(users.length === newUsers.length) {
      throw new Error("User not found to delete.");
    }
    storeUsers(newUsers);
  },
};
