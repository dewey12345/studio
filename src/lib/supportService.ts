
'use client';
import { v4 as uuidv4 } from 'uuid';
import type { SupportTicket } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy } from 'firebase/firestore';


const ticketsCollection = collection(db, 'support-tickets');

export const supportService = {
    createTicket: async (data: Omit<SupportTicket, 'id' | 'timestamp' | 'status'>): Promise<SupportTicket> => {
        const newTicket: SupportTicket = {
            ...data,
            id: uuidv4(), // Still useful for unique keys
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        await addDoc(ticketsCollection, newTicket);
        return newTicket;
    },

    getAllTickets: async (): Promise<SupportTicket[]> => {
        const q = query(ticketsCollection, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SupportTicket);
    },

    getTicketsForUser: async (userId: string): Promise<SupportTicket[]> => {
        const q = query(
            ticketsCollection, 
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SupportTicket);
    },

    updateTicketStatus: async (ticketId: string, status: 'pending' | 'resolved'): Promise<SupportTicket> => {
        const q = query(ticketsCollection, where('id', '==', ticketId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error("Ticket not found.");
        }
        const ticketDoc = snapshot.docs[0];
        await updateDoc(ticketDoc.ref, { status });
        return { ...ticketDoc.data(), status } as SupportTicket;
    }
};
