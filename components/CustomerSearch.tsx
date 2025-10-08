
import React, { useState, useEffect, useMemo } from 'react';
import type { User, Customer } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
// FIX: Corrected import path for common components.
import { Modal } from './common';

interface CustomerSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCustomer: (customer: Customer) => void;
    user: User;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({ isOpen, onClose, onSelectCustomer, user }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            const fetchCustomers = async () => {
                try {
                    const data = await api.getCustomers(user.market_id);
                    setCustomers(data);
                } catch {
                    addToast({ message: 'Erro ao buscar clientes.', type: 'error' });
                }
            };
            fetchCustomers();
        }
    }, [isOpen, user.market_id, addToast]);
    
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cpf.includes(searchTerm)
        );
    }, [customers, searchTerm]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buscar Cliente">
            <div className="p-4">
                <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 mb-4 rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary"
                    autoFocus
                />
                <div className="max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredCustomers.map(c => (
                            <li key={c.id}>
                                <button onClick={() => onSelectCustomer(c)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <p className="font-semibold">{c.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.cpf}</p>
                                </button>
                            </li>
                        ))}
                         {filteredCustomers.length === 0 && (
                            <li className="p-4 text-center text-gray-500">Nenhum cliente encontrado.</li>
                        )}
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

export default CustomerSearch;
