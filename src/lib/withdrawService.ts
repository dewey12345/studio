
'use client';
import { v4 as uuidv4 } from 'uuid';
import type { WithdrawalRequest } from './types';
import { WITHDRAWAL_REQUESTS_KEY } from './constants';
import { authService } from './auth';

const getStoredRequests = (): WithdrawalRequest[] => {
    if (typeof window === 'undefined') return [];
    const requestsJson = localStorage.getItem(WITHDRAWAL_REQUESTS_KEY);
    return requestsJson ? JSON.parse(requestsJson) : [];
};

const storeRequests = (requests: WithdrawalRequest[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WITHDRAWAL_REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('storage'));
};

export const withdrawalService = {
    createRequest: (data: Omit<WithdrawalRequest, 'id' | 'timestamp' | 'status'>) => {
        const requests = getStoredRequests();
        const newRequest: WithdrawalRequest = {
            ...data,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        requests.unshift(newRequest);
        storeRequests(requests);
        return newRequest;
    },

    getAllRequests: (): WithdrawalRequest[] => {
        return getStoredRequests();
    },

    getRequestsForUser: (userId: string): WithdrawalRequest[] => {
        const requests = getStoredRequests();
        return requests.filter(req => req.userId === userId);
    },

    updateRequestStatus: (reqId: string, status: 'pending' | 'sent') => {
        const requests = getStoredRequests();
        const reqIndex = requests.findIndex(r => r.id === reqId);
        if (reqIndex === -1) {
            throw new Error("Request not found.");
        }
        
        const request = requests[reqIndex];
        // Only deduct balance when moving to 'sent' for the first time
        if (request.status === 'pending' && status === 'sent') {
            try {
                authService.updateBalance(request.userId, -request.amount);
            } catch (error: any) {
                // If balance deduction fails, don't update the status
                throw new Error(`Failed to deduct balance: ${error.message}`);
            }
        }

        request.status = status;
        storeRequests(requests);
        return request;
    }
};
