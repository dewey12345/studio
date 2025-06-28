
'use client';
import { v4 as uuidv4 } from 'uuid';
import type { WithdrawalRequest } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy } from 'firebase/firestore';
import { authService } from './auth';

const requestsCollection = collection(db, 'withdrawal-requests');

export const withdrawalService = {
    createRequest: async (data: Omit<WithdrawalRequest, 'id' | 'timestamp' | 'status'>): Promise<WithdrawalRequest> => {
        const newRequest: WithdrawalRequest = {
            ...data,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        await addDoc(requestsCollection, newRequest);
        return newRequest;
    },

    getAllRequests: async (): Promise<WithdrawalRequest[]> => {
        const q = query(requestsCollection, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as WithdrawalRequest);
    },

    getRequestsForUser: async (userId: string): Promise<WithdrawalRequest[]> => {
        const q = query(
            requestsCollection, 
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as WithdrawalRequest);
    },

    updateRequestStatus: async (reqId: string, status: 'pending' | 'sent'): Promise<WithdrawalRequest> => {
        const q = query(requestsCollection, where('id', '==', reqId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error("Request not found.");
        }
        
        const reqDoc = snapshot.docs[0];
        const request = reqDoc.data() as WithdrawalRequest;

        if (request.status === 'pending' && status === 'sent') {
            try {
                await authService.updateBalance(request.userId, -request.amount);
            } catch (error: any) {
                throw new Error(`Failed to deduct balance: ${error.message}`);
            }
        }

        await updateDoc(reqDoc.ref, { status });
        return { ...request, status };
    }
};
