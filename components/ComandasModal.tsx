

import React, { useState, useEffect, useCallback } from 'react';
import type { User, Sale } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { useInterval } from '../hooks';
// FIX: Corrected import path for common components.
import { Modal, Icon } from './common';

interface ComandasModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSelectComanda: (comanda: Sale) => void;
}

const ComandasModal: React.FC<ComandasModalProps> = ({ isOpen, onClose, user, onSelectComanda }) => {
    const [openSales, setOpenSales] = useState<Sale[]>([]);
    const [newComandaName, setNewComandaName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const fetchOpenSales = useCallback(async () => {
        setIsLoading(true);
        try {
            const allSales = await api.getOpenSales(user.market_id);
            setOpenSales(allSales);
        } catch {
            addToast({ message: 'Erro ao carregar comandas.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [user.market_id, addToast]);


    useEffect(() => {
        if (isOpen) {
            fetchOpenSales();
        }
    }, [isOpen, fetchOpenSales]);
    
    useInterval(() => {
        if(isOpen) fetchOpenSales();
    }, 10000); // Refresh every 10 seconds

    const handleCreateComanda = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newComandaName.trim()) {
            addToast({ message: 'Digite um nome para a comanda.', type: 'warning' });
            return;
        }

        try {
            // FIX: Added missing operator_id property.
            const newComanda = await api.createOpenSale({
                market_id: user.market_id,
                operator_id: user.id,
                operator_name: user.name,
                customer_name: newComandaName.trim(),
            });
            addToast({ message: `Comanda "${newComanda.customer_name}" criada!`, type: 'success' });
            setNewComandaName('');
            fetchOpenSales();
        } catch {
             addToast({ message: 'Erro ao criar comanda.', type: 'error' });
        }
    }
    
    const handleDeleteComanda = async (sale: Sale) => {
        if (sale.items.length > 0) {
            addToast({ message: 'Não é possível excluir comandas com itens.', type: 'error' });
            return;
        }
        if (window.confirm(`Deseja excluir a comanda "${sale.customer_name}"?`)) {
            try {
                await api.deleteSale(sale.id);
                addToast({ message: 'Comanda excluída.', type: 'info' });
                fetchOpenSales();
            } catch {
                addToast({ message: 'Erro ao excluir comanda.', type: 'error' });
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Comandas" size="2xl">
            <div className="flex flex-col h-[70vh]">
                 {/* Create Comanda */}
                 <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleCreateComanda} className="flex gap-2">
                        <input
                            type="text"
                            value={newComandaName}
                            onChange={e => setNewComandaName(e.target.value)}
                            placeholder="Nome da Comanda (Ex: Mesa 5)"
                            className="flex-1 p-2 rounded-md bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary"
                        />
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
                            Criar
                        </button>
                    </form>
                </div>
                
                {/* Comandas List */}
                <div className="p-4 flex-1 overflow-y-auto">
                    {isLoading && openSales.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Carregando comandas...</p>
                    ) : openSales.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Nenhuma comanda aberta.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {openSales.filter(s => s.status === 'open').map(sale => (
                                <div key={sale.id} className="relative bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between group">
                                    <div>
                                        <h3 className="font-bold text-primary truncate">{sale.customer_name}</h3>
                                        <p className="text-sm">Itens: {sale.items.length}</p>
                                        <p className="text-xl font-semibold mt-2">R$ {sale.total.toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => onSelectComanda(sale)} className="w-full mt-4 p-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition">
                                        Carregar
                                    </button>
                                    {sale.items.length === 0 && (
                                        <button onClick={() => handleDeleteComanda(sale)} className="absolute top-2 right-2 p-1 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon name="x-mark" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ComandasModal;