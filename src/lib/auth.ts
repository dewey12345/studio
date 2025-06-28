
'use client';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, doc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { User } from './types';
import { CURRENT_USER_KEY } from './constants';

const usersCollection = collection(db, 'users');

async function seedInitialUsers() {
    const snapshot = await getDocs(usersCollection);
    if (snapshot.empty) {
        console.log('No users found, seeding initial data...');
        const batch = writeBatch(db);

        const adminUser: Omit<User, 'id'> = { 
            email: 'imblaster2019@gmail.com', 
            phone: '1234567890', 
            password: 'password', // In a real app, HASH THIS
            role: 'admin', 
            balance: 99999 
        };
        const regularUser: Omit<User, 'id'> = { 
            email: 'user@example.com', 
            phone: '0987654321', 
            password: 'password', // In a real app, HASH THIS
            role: 'user', 
            balance: 1000 
        };

        batch.set(doc(usersCollection, 'admin_user_01'), adminUser);
        batch.set(doc(usersCollection, 'regular_user_01'), regularUser);
        
        await batch.commit();
        console.log('Initial users seeded.');
    }
}

const storeCurrentUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
        const { password, ...userToStore } = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth-change'));
};


export const authService = {
  seedInitialUsers,

  register: async (email: string, password_raw: string, phone?: string): Promise<User> => {
    let q = query(usersCollection, where('email', '==', email));
    let querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('User with this email already exists.');
    }

    if (phone) {
        q = query(usersCollection, where('phone', '==', phone));
        querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('User with this phone number already exists.');
        }
    }
    
    const newUser: Omit<User, 'id'> = {
      email,
      phone,
      password: password_raw,
      role: 'user',
      balance: 1000,
    };

    const docRef = await addDoc(usersCollection, newUser);
    return { id: docRef.id, ...newUser };
  },

  login: async (credential: string, password_raw: string): Promise<User> => {
    const isEmail = credential.includes('@');
    const q = query(usersCollection, where(isEmail ? 'email' : 'phone', '==', credential));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        throw new Error('Invalid credentials or password.');
    }

    const userDoc = querySnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as User;

    if (user.password !== password_raw) {
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
  
  getUsers: async (withPassword = false): Promise<(User | Omit<User, 'password'>)[]> => {
    const snapshot = await getDocs(usersCollection);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    if (withPassword) {
        return users;
    }
    return users.map(({ password, ...user }) => user);
  },
  
  updateUser: async (id: string, email: string, newPassword?: string): Promise<User> => {
    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        throw new Error("User not found");
    }

    const updateData: Partial<User> = { email };
    if (newPassword) {
        updateData.password = newPassword;
    }

    await updateDoc(userRef, updateData);
    const updatedUser = { ...userSnap.data(), ...updateData } as User;
    
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser({ ...currentUser, ...updateData });
    }
    
    return updatedUser;
  },

  updateUserByAdmin: async (id: string, data: Partial<User>): Promise<User> => {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, data);
    const updatedUser = (await getDoc(userRef)).data() as User;
    
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === id) {
        storeCurrentUser({ id, ...updatedUser });
    }
    return { id, ...updatedUser };
  },

  updateBalance: async (id: string, amount: number): Promise<User> => {
    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        throw new Error("User not found");
    }
    const userData = userSnap.data() as User;
    const newBalance = userData.balance + amount;
    if (newBalance < 0) throw new Error("Insufficient funds.");
    
    await updateDoc(userRef, { balance: newBalance });
    const updatedUserData = { ...userData, balance: newBalance, id };

    const currentUser = authService.getCurrentUser();
    if(currentUser && currentUser.id === id) {
      storeCurrentUser(updatedUserData);
    }
    return updatedUserData;
  },
  
  updateMultipleUsers: async (updatedUsers: User[]) => {
    const batch = writeBatch(db);
    updatedUsers.forEach(user => {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, { balance: user.balance });
    });
    await batch.commit();
  },

  addUser: async (data: Omit<User, 'id'>): Promise<User> => {
    // Check for existing user logic similar to register
    const docRef = await addDoc(usersCollection, data);
    return { id: docRef.id, ...data };
  },

  deleteUser: async (id: string) => {
    const userRef = doc(db, 'users', id);
    await deleteDoc(userRef);
  },
};
