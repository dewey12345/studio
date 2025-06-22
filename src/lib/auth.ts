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
  const adminUser: User = { id: uuidv4(), email: 'imblaster2019@gmail.com', password: 'password', role: 'admin', balance: 9999 };
  localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
  return [adminUser];
};

const storeUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Dispatch a custom event to notify other components of auth change
  window.dispatchEvent(new CustomEvent('storage'));
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
      balance: 1000, // Starting balance for new users
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
  
  // Gets all users but omits their passwords for security
  getUsers: (): Omit<User, 'password'>[] => {
    const users = getStoredUsers();
    // Return users without passwords
    return users.map(({ password, ...user }) => user);
  },
  
  // For a user to update their own credentials
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

  // For an admin to update any user's full profile
  updateUserByAdmin: (id: string, data: Partial<User>) => {
    let users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error("User not found");
    }
    
    // Ensure new email isn't a duplicate
    if (data.email && users.some(u => u.email === data.email && u.id !== id)) {
      throw new Error("Email is already in use by another account.");
    }
    
    // Create the updated user object, keeping the old password if a new one isn't provided
    const updatedUser = { 
      ...users[userIndex], 
      ...data,
      password: data.password || users[userIndex].password,
    };

    users[userIndex] = updatedUser;
    storeUsers(users);

    // If the updated user is the current user, update their session
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser(updatedUser);
    }

    return updatedUser;
  },

  // For a user to add to their own balance
  updateBalance: (id: string, amount: number) => {
    if(amount <= 0) throw new Error("Amount must be positive.");
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");

    const newBalance = users[userIndex].balance + amount;
    users[userIndex].balance = newBalance;
    storeUsers(users);

    const currentUser = authService.getCurrentUser();
    if(currentUser && currentUser.id === id) {
      storeCurrentUser(users[userIndex]);
    }
    return users[userIndex];
  },

  // For an admin to create a new user
  addUser: (data: Omit<User, 'id'>) => {
    let users = getStoredUsers();
    if (users.some(u => u.email === data.email)) {
      throw new Error("User with this email already exists.");
    }
    const newUser: User = {
      id: uuidv4(),
      ...data
    };
    users.push(newUser);
    storeUsers(users);
    return newUser;
  },

  // For an admin to delete a user
  deleteUser: (id: string) => {
    let users = getStoredUsers();
    const newUsers = users.filter(u => u.id !== id);
    if(users.length === newUsers.length) {
      throw new Error("User not found to delete.");
    }
    storeUsers(newUsers);
  },
};
