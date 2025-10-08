import React, { useState, useEffect } from 'react';
import type { User, Sale } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { useInterval } from '../hooks';
import { Modal } from './common';

interface ComandasModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const ComandasModal: React.FC<ComandasModalProps> = ({ isOpen, onClose, user }) => {
    const [openSales, setOpenSales] = useState<Sale[]>([]);
    const { addToast } = useToast();

    const fetchOpenSales = async () => {
        try {
            const allSales = await api.getSales(user.market_id);
            setOpenSales(allSales.filter(s => s.status !== 'completed'));
        } catch {
            addToast({ message: 'Erro ao carregar comandas.', type: 'error' });
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchOpenSales();
        }
    }, [isOpen, user.market_id]);
    
    useInterval(() => {
        if(isOpen) fetchOpenSales();
    }, 10000); // Refresh every 10 seconds

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Comandas Abertas" size="xl">
            <div className="p-4 h-[60vh] overflow-y-auto">
                {openSales.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">Nenhuma comanda aberta.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {openSales.map(sale => (
                            <div key={sale.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                                <h3 className="font-bold text-primary">Pedido #{sale.order_number}</h3>
                                <p className="text-sm">Cliente: {sale.customer_name || 'Não identificado'}</p>
                                <p className="text-sm font-semibold">Total: R$ {sale.total.toFixed(2)}</p>
                                <p className="text-xs mt-2">Status: <span className="font-bold">{sale.status.toUpperCase()}</span></p>
                                <ul className="text-xs mt-1 border-t pt-1">
                                    {sale.items.map(item => (
                                        <li key={item.id}>{item.qty}x {item.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ComandasModal;
