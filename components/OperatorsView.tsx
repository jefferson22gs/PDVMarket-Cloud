
import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
// FIX: Corrected import path for common components.
import { Modal } from './common';

interface OperatorsViewProps {
    user: User;
}

const OperatorForm: React.FC<{ operator: Partial<User> | null; onSave: (operator: Omit<User, 'id' | 'market_id' | 'type'>) => void; onCancel: () => void; }> = ({ operator, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: operator?.name || '',
        email: operator?.email || '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Password is required only for new users in this form
        if (!operator && !formData.password) {
            alert('A senha é obrigatória para novos operadores.');
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} placeholder={operator ? 'Deixe em branco para não alterar' : ''} required={!operator} className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none">Salvar</button>
            </div>
        </form>
    );
}

const OperatorsView: React.FC<OperatorsViewProps> = ({ user: owner }) => {
    const [operators, setOperators] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOperator, setEditingOperator] = useState<User | null>(null);
    const { addToast } = useToast();

    const fetchOperators = async () => {
        setIsLoading(true);
        try {
            const data = await api.getOperators(owner.market_id);
            setOperators(data);
        } catch (error) {
            addToast({ message: 'Falha ao buscar operadores.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owner.market_id]);

    const handleOpenModal = (operator: User | null = null) => {
        setEditingOperator(operator);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingOperator(null);
        setIsModalOpen(false);
    };

    const handleSaveOperator = async (operatorData: Omit<User, 'id' | 'market_id' | 'type'>) => {
        try {
             if (editingOperator) {
                const dataToUpdate = { ...operatorData };
                if (!dataToUpdate.password) {
                    delete dataToUpdate.password; // Don't send empty password
                }
                await api.updateOperator(editingOperator.id, dataToUpdate);
                addToast({ message: 'Operador atualizado com sucesso!', type: 'success' });
            } else {
                await api.addOperator({ ...operatorData, market_id: owner.market_id });
                addToast({ message: 'Operador adicionado com sucesso!', type: 'success' });
            }
            fetchOperators();
            handleCloseModal();
        } catch (error) {
            addToast({ message: `Erro ao salvar operador.`, type: 'error' });
        }
    };

    const handleDeleteOperator = async (operatorId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este operador?')) {
            try {
                await api.deleteOperator(operatorId);
                addToast({ message: 'Operador excluído com sucesso!', type: 'success' });
                fetchOperators();
            } catch (error) {
                addToast({ message: 'Erro ao excluir operador.', type: 'error' });
            }
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gerenciamento de Operadores</h2>
                 <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
                    Novo Operador
                </button>
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nome</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center p-6">Carregando...</td></tr>
                        ) : operators.map(op => (
                            <tr key={op.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{op.name}</th>
                                <td className="px-6 py-4">{op.email}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleOpenModal(op)} className="font-medium text-primary dark:text-primary-400 hover:underline">Editar</button>
                                    <button onClick={() => handleDeleteOperator(op.id)} className="font-medium text-danger dark:text-danger-400 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !isLoading && operators.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhum operador cadastrado.</p>
                    </div>
                )}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingOperator ? 'Editar Operador' : 'Novo Operador'}>
                <OperatorForm operator={editingOperator} onSave={handleSaveOperator} onCancel={handleCloseModal} />
            </Modal>

        </div>
    );
};

export default OperatorsView;
