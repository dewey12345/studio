// NOTE: This is a mock authentication service for demonstration purposes.
// It uses localStorage and is not secure for production environments.
'use client';

import { v4 as uuidv4 } from 'uuid';
import type { User } from './types';

const USERS_KEY = 'color_clash_users';
const CURRENT_USER_KEY = 'color_clash_current_user';

const getStoredUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const usersJson = localStorage.getItem(USERS_KEY);
  if (usersJson) {
    return JSON.parse(usersJson);
  }
  // Create a default admin user if none exist
  const adminUser: User = { id: uuidv4(), email: 'admin@example.com', password: 'password', role: 'admin' };
  localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
  return [adminUser];
};

const storeUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Dispatch a custom event to notify other components of auth change
  window.dispatchEvent(new CustomEvent('auth-change'));
};

const storeCurrentUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
        // Omit password before storing
        const { password, ...userToStore } = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth-change'));
};


export const authService = {
  register: (email: string, password_raw: string): User => {
    const users = getStoredUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('User with this email already exists.');
    }
    const newUser: User = {
      id: uuidv4(),
      email,
      password: password_raw, // In a real app, you would hash this
      role: 'user',
    };
    users.push(newUser);
    storeUsers(users);
    return newUser;
  },

  login: (email: string, password_raw: string): User => {
    const users = getStoredUsers();
    const user = users.find(u => u.email === email);
    if (!user || user.password !== password_raw) { // In a real app, compare hashed passwords
      throw new Error('Invalid email or password.');
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
  
  getUsers: (): User[] => {
    const users = getStoredUsers();
    // Return users without passwords
    return users.map(({ password, ...user }) => user);
  },
  
  updateUser: (id: string, email: string, newPassword?: string) => {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error("User not found");
    }

    // Check if new email is already taken by another user
    if (users.some(u => u.email === email && u.id !== id)) {
        throw new Error("Email is already in use by another account.");
    }

    const updatedUser = { ...users[userIndex], email };
    if (newPassword) {
        updatedUser.password = newPassword;
    }

    users[userIndex] = updatedUser;
    storeUsers(users);

    // If the updated user is the current user, update their session
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser(updatedUser);
    }
    
    return updatedUser;
  }
};
