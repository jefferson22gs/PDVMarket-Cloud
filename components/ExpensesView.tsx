import React, { useState, useEffect, useMemo } from 'react';
import type { User, Expense } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { Modal, Icon } from './common';

interface ExpensesViewProps {
    user: User;
}

const ExpenseForm: React.FC<{ expense: Partial<Expense> | null; onSave: (expense: Omit<Expense, 'id' | 'market_id'>) => void; onCancel: () => void; }> = ({ expense, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        description: expense?.description || '',
        amount: expense?.amount || 0,
        category: expense?.category || 'Variável',
        date: expense?.date || new Date().toISOString().split('T')[0],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                    <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
                    <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange} required min="0.01" step="0.01" className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                    <select name="category" id="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2">
                        <option>Fixo</option>
                        <option>Variável</option>
                        <option>Custo</option>
                        <option>Pessoal</option>
                        <option>Outros</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none">Salvar</button>
            </div>
        </form>
    );
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ user }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const { addToast } = useToast();

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const data = await api.getExpenses(user.market_id);
            setExpenses(data);
        } catch (error) {
            addToast({ message: 'Falha ao buscar despesas.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.market_id]);

    const handleOpenModal = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingExpense(null);
        setIsModalOpen(false);
    };

    const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'market_id'>) => {
        try {
            if (editingExpense) {
                await api.updateExpense(editingExpense.id, expenseData);
                addToast({ message: 'Despesa atualizada com sucesso!', type: 'success' });
            } else {
                await api.addExpense({ ...expenseData, market_id: user.market_id });
                addToast({ message: 'Despesa adicionada com sucesso!', type: 'success' });
            }
            fetchExpenses();
            handleCloseModal();
        } catch (error) {
            addToast({ message: 'Erro ao salvar despesa.', type: 'error' });
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
            try {
                await api.deleteExpense(expenseId);
                addToast({ message: 'Despesa excluída com sucesso!', type: 'success' });
                fetchExpenses();
            } catch (error) {
                addToast({ message: 'Erro ao excluir despesa.', type: 'error' });
            }
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gerenciamento de Despesas</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
                    Nova Despesa
                </button>
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Data</th>
                            <th scope="col" className="px-6 py-3">Descrição</th>
                            <th scope="col" className="px-6 py-3">Categoria</th>
                            <th scope="col" className="px-6 py-3">Valor</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center p-6">Carregando...</td></tr>
                        ) : expenses.map(expense => (
                            <tr key={expense.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <td className="px-6 py-4">{new Date(`${expense.date}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{expense.description}</th>
                                <td className="px-6 py-4">{expense.category}</td>
                                <td className="px-6 py-4 font-bold text-red-500">R$ {expense.amount.toFixed(2)}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleOpenModal(expense)} className="font-medium text-primary dark:text-primary-400 hover:underline">Editar</button>
                                    <button onClick={() => handleDeleteExpense(expense.id)} className="font-medium text-danger dark:text-danger-400 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !isLoading && expenses.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhuma despesa encontrada.</p>
                    </div>
                )}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}>
                <ExpenseForm expense={editingExpense} onSave={handleSaveExpense} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default ExpensesView;
