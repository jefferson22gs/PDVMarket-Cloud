

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User, View, Sale, SaleStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { useInterval } from '../hooks';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Corrected import path for common components.
import { Icon } from './common';

interface KitchenViewProps {
    user: User;
    onSwitchView: (view: View) => void;
    onLogout: () => void;
}

const OrderTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useInterval(() => {
        const seconds = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
        setElapsed(seconds);
    }, 1000);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timeColor = useMemo(() => {
        if (elapsed > 600) return 'text-red-500'; // > 10 mins
        if (elapsed > 300) return 'text-amber-500'; // > 5 mins
        return 'text-green-500';
    }, [elapsed]);

    return (
        <span className={`font-mono font-semibold ${timeColor}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
};


// FIX: Changed onUpdateStatus id parameter from string to number.
const OrderCard: React.FC<{ order: Sale; onUpdateStatus: (id: number, status: SaleStatus) => void; }> = ({ order, onUpdateStatus }) => {
    const nextStatusMap: Partial<Record<SaleStatus, SaleStatus>> = {
        pending: 'preparing',
        preparing: 'ready',
        ready: 'completed',
    };
    const actionTextMap: Partial<Record<SaleStatus, string>> = {
        pending: 'Iniciar Preparo',
        preparing: 'Marcar como Pronto',
        ready: 'Entregar Pedido',
    };

    const handleActionClick = () => {
        const nextStatus = nextStatusMap[order.status];
        if (nextStatus) {
            onUpdateStatus(order.id, nextStatus);
        }
    };
    
    return (
        <motion.div 
            layout="position"
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col gap-3"
        >
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="font-bold text-lg text-primary">Pedido #{order.order_number}</h3>
                <OrderTimer startTime={order.created_at} />
            </div>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 flex-1">
                {order.items.map(item => (
                    <li key={item.id} className="flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        <span>R$ {(item.price * item.qty).toFixed(2)}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={handleActionClick}
                className="w-full p-3 rounded-md text-white font-bold transition-colors bg-primary hover:bg-primary/90"
            >
                {actionTextMap[order.status]}
            </button>
        </motion.div>
    );
};


const KitchenView: React.FC<KitchenViewProps> = ({ user, onSwitchView, onLogout }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const { addToast } = useToast();
    const audioContextRef = useRef<AudioContext | null>(null);
    // FIX: Changed useRef to use Set<number> to match sale ID type.
    const knownPendingIds = useRef(new Set<number>());

    const playNotificationSound = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.5);
        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.5);
    }, []);

    const fetchSales = useCallback(async () => {
        try {
            const data = await api.getSales(user.market_id);
            const activeSales = data.filter(s => s.status === 'pending' || s.status === 'preparing' || s.status === 'ready');

            const currentPendingIds = new Set(activeSales.filter(s => s.status === 'pending').map(s => s.id));
            if (knownPendingIds.current.size > 0) { // Don't play sound on first load
                 currentPendingIds.forEach(id => {
                    if (!knownPendingIds.current.has(id)) {
                        playNotificationSound();
                    }
                });
            }
            knownPendingIds.current = currentPendingIds;

            setSales(activeSales.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        } catch (error) {
            addToast({ message: 'Erro ao buscar pedidos.', type: 'error' });
        }
    }, [user.market_id, addToast, playNotificationSound]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);
    
    useInterval(fetchSales, 5000); // Poll for new sales every 5 seconds

    // FIX: Changed saleId type from string to number.
    const handleUpdateStatus = async (saleId: number, status: SaleStatus) => {
        try {
            await api.updateSale(saleId, { status });
            addToast({ message: `Pedido #${sales.find(s=>s.id === saleId)?.order_number} atualizado!`, type: 'success' });
            fetchSales(); // Refresh data immediately
        } catch {
            addToast({ message: 'Erro ao atualizar status do pedido.', type: 'error' });
        }
    };

    const columns: { status: SaleStatus; title: string; color: string }[] = [
        { status: 'pending', title: 'Novos Pedidos', color: 'bg-blue-500' },
        { status: 'preparing', title: 'Em Preparo', color: 'bg-amber-500' },
        { status: 'ready', title: 'Prontos', color: 'bg-green-500' },
    ];
    
    const ordersByStatus = useMemo(() => {
        return sales.reduce((acc, sale) => {
            (acc[sale.status] = acc[sale.status] || []).push(sale);
            return acc;
        }, {} as Record<SaleStatus, Sale[]>);
    }, [sales]);

    return (
         <div className="h-screen w-full flex flex-col bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Icon name="fire" /> Cozinha</h1>
                <div className="flex items-center gap-4">
                     <button onClick={() => onSwitchView('pdv')} className="px-4 py-2 rounded-md bg-gray-600 text-white font-semibold hover:bg-gray-700 transition">Voltar ao PDV</button>
                    <button onClick={onLogout} className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition">Sair</button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-x-auto">
                {columns.map(col => (
                    <div key={col.status} className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                         <div className={`flex items-center gap-2 p-2 rounded-md text-white font-bold ${col.color}`}>
                            <h3>{col.title}</h3>
                            <span className="bg-white/30 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                {(ordersByStatus[col.status] || []).length}
                            </span>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                             <AnimatePresence>
                                {(ordersByStatus[col.status] || []).map(order => (
                                    <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                                ))}
                             </AnimatePresence>
                             {(ordersByStatus[col.status] || []).length === 0 && (
                                <div className="text-center text-gray-400 dark:text-gray-500 pt-10">
                                    <p>Nenhum pedido aqui.</p>
                                </div>
                             )}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default KitchenView;