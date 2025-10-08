import React, { useState, useEffect, useMemo } from 'react';
import type { User, Customer } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { Modal, Icon } from './common';

interface CustomersViewProps {
    user: User;
}

const CustomerForm: React.FC<{ customer: Partial<Customer> | null; onSave: (customer: Omit<Customer, 'id' | 'market_id'>) => void; onCancel: () => void; }> = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        cpf: customer?.cpf || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF</label>
                    <input type="text" name="cpf" id="cpf" value={formData.cpf} onChange={handleChange} className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none">Salvar</button>
            </div>
        </form>
    );
}

const CustomersView: React.FC<CustomersViewProps> = ({ user }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const { addToast } = useToast();

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCustomers(user.market_id);
            setCustomers(data);
        } catch (error) {
            addToast({ message: 'Falha ao buscar clientes.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [user.market_id]);

    const handleOpenModal = (customer: Customer | null = null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(false);
    };

    const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'market_id'>) => {
        try {
            if (editingCustomer) {
                await api.updateCustomer(editingCustomer.id, customerData);
                addToast({ message: 'Cliente atualizado com sucesso!', type: 'success' });
            } else {
                await api.addCustomer({ ...customerData, market_id: user.market_id });
                addToast({ message: 'Cliente adicionado com sucesso!', type: 'success' });
            }
            fetchCustomers();
            handleCloseModal();
        } catch (error) {
            addToast({ message: `Erro ao salvar cliente.`, type: 'error' });
        }
    };

    const handleDeleteCustomer = async (customerId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await api.deleteCustomer(customerId);
                addToast({ message: 'Cliente excluído com sucesso!', type: 'success' });
                fetchCustomers();
            } catch (error) {
                addToast({ message: 'Erro ao excluir cliente.', type: 'error' });
            }
        }
    };
    
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cpf.includes(searchTerm)
        );
    }, [customers, searchTerm]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gerenciamento de Clientes</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou CPF..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
                        Novo Cliente
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nome</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Telefone</th>
                            <th scope="col" className="px-6 py-3">CPF</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center p-6">Carregando...</td></tr>
                        ) : filteredCustomers.map(customer => (
                            <tr key={customer.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{customer.name}</th>
                                <td className="px-6 py-4">{customer.email}</td>
                                <td className="px-6 py-4">{customer.phone}</td>
                                <td className="px-6 py-4">{customer.cpf}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => handleOpenModal(customer)} className="font-medium text-primary dark:text-primary-400 hover:underline">Editar</button>
                                    <button onClick={() => handleDeleteCustomer(customer.id)} className="font-medium text-danger dark:text-danger-400 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !isLoading && filteredCustomers.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhum cliente encontrado.</p>
                    </div>
                )}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}>
                <CustomerForm customer={editingCustomer} onSave={handleSaveCustomer} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default CustomersView;
