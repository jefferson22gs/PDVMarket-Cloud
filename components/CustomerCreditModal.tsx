import React, { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerTransaction } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { Modal, Icon } from './common';

interface CustomerCreditModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
    onPaymentSuccess: (updatedCustomer: Customer) => void;
}

const CustomerCreditModal: React.FC<CustomerCreditModalProps> = ({ isOpen, onClose, customer, onPaymentSuccess }) => {
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const { addToast } = useToast();

    const fetchTransactions = useCallback(async () => {
        if (!customer) return;
        setIsLoading(true);
        try {
            const data = await api.getCustomerTransactions(customer.id);
            setTransactions(data);
        } catch {
            addToast({ message: 'Erro ao carregar extrato do cliente.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [customer, addToast]);

    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen, fetchTransactions]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast({ message: 'Valor de pagamento inválido.', type: 'error' });
            return;
        }
        if (amount > customer.credit_balance) {
            if(!window.confirm(`O valor do pagamento (R$ ${amount.toFixed(2)}) é maior que o saldo devedor (R$ ${customer.credit_balance.toFixed(2)}). Deseja continuar?`)) {
                return;
            }
        }
        
        setIsLoading(true);
        try {
            const updatedCustomer = await api.addCustomerPayment(customer.id, amount);
            addToast({ message: 'Pagamento registrado com sucesso!', type: 'success' });
            onPaymentSuccess(updatedCustomer);
            setPaymentAmount('');
            fetchTransactions();
        } catch {
            addToast({ message: 'Erro ao registrar pagamento.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Conta de ${customer.name}`} size="3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                {/* Left: Summary and Payment */}
                <div className="md:col-span-1 space-y-4">
                     <div className="text-center bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Saldo Devedor</p>
                        <p className={`text-3xl font-bold ${customer.credit_balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            R$ {customer.credit_balance.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Limite Total: R$ {customer.credit_limit.toFixed(2)}</p>
                    </div>

                    <form onSubmit={handleAddPayment} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Registrar Pagamento</h4>
                        <label htmlFor="payment" className="sr-only">Valor do pagamento</label>
                        <input
                            type="number"
                            id="payment"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                            placeholder="Valor (R$)"
                            min="0.01"
                            step="0.01"
                            required
                            className="w-full p-2 rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600"
                        />
                        <button type="submit" disabled={isLoading} className="w-full mt-3 p-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50">
                            {isLoading ? 'Registrando...' : 'Confirmar Pagamento'}
                        </button>
                    </form>
                </div>
                {/* Right: Transactions */}
                <div className="md:col-span-2">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Extrato da Conta</h4>
                    <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-2">Data</th>
                                    <th scope="col" className="px-4 py-2">Tipo</th>
                                    <th scope="col" className="px-4 py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={3} className="text-center p-6">Carregando...</td></tr>
                                ) : transactions.map(t => (
                                    <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                        <td className="px-4 py-2">{new Date(t.timestamp).toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                t.type === 'purchase' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            }`}>
                                                {t.type === 'purchase' ? 'Compra' : 'Pagamento'}
                                            </span>
                                            {t.related_sale_id && <span className="text-xs text-gray-400 ml-2">#{t.related_sale_id.substring(0, 6)}</span>}
                                        </td>
                                        <td className={`px-4 py-2 text-right font-semibold ${t.type === 'purchase' ? 'text-red-500' : 'text-green-500'}`}>
                                            {t.type === 'purchase' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && transactions.length === 0 && (
                                     <tr><td colSpan={3} className="text-center p-6 text-gray-400">Nenhuma transação encontrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CustomerCreditModal;