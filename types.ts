import type { Chat } from "@google/genai";

export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    type: 'owner' | 'operator';
    market_id: number;
}

export type View = 'login' | 'pdv' | 'admin' | 'kitchen';

export interface ToastMessage {
    id?: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

export interface Product {
    id: string;
    market_id: number;
    name: string;
    code: string;
    price: number;
    cost: number;
    stock: number;
}

export interface CartItem extends Product {
    qty: number;
}

export type PaymentMethod = 'money' | 'credit' | 'debit' | 'pix';

export type SaleStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface Sale {
    id: string;
    market_id: number;
    order_number: number;
    items: { id: string; name: string; price: number; qty: number; }[];
    total: number;
    payment_method: PaymentMethod;
    received: number;
    change: number;
    status: SaleStatus;
    operator_name: string;
    customer_id?: number | null;
    customer_name?: string;
    created_at: string; // ISO string
}

export interface Customer {
    id: number;
    market_id: number;
    name: string;
    email: string;
    phone: string;
    cpf: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ChatSession {
    chat: Chat;
    marketData: {
        products: Product[];
        sales: Sale[];
    };
}
