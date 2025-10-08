
import React, { useState, useRef } from 'react';
import { Modal, Icon } from './common';
import { api } from '../services/api';
import { useToast } from '../App';
import type { User } from '../types';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRegisterSuccess: (user: User) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onRegisterSuccess }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [marketData, setMarketData] = useState({
        name: '',
        cnpj: '',
        ie: '',
        address: '',
        city: '',
        phone: '',
    });
    
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleMarketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMarketData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if(file.size > 1024 * 1024) { // 1MB limit
                addToast({ message: 'O logo deve ter no máximo 1MB.', type: 'error' });
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (userData.password !== userData.confirmPassword) {
            addToast({ message: 'As senhas não coincidem.', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const registeredUser = await api.register(userData, marketData, logoFile);
            if (registeredUser) {
                addToast({ message: 'Cadastro realizado com sucesso! Bem-vindo(a)!', type: 'success' });
                onRegisterSuccess(registeredUser);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
            addToast({ message: `Falha no cadastro: ${errorMessage}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cadastro de Novo Mercado" size="3xl">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Dados do Mercado</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" placeholder="Nome do Mercado" value={marketData.name} onChange={handleMarketChange} required className="input-style" />
                        <input name="cnpj" placeholder="CNPJ" value={marketData.cnpj} onChange={handleMarketChange} required className="input-style" />
                        <input name="ie" placeholder="Inscrição Estadual (Opcional)" value={marketData.ie} onChange={handleMarketChange} className="input-style" />
                        <input name="phone" type="tel" placeholder="Telefone" value={marketData.phone} onChange={handleMarketChange} required className="input-style" />
                        <input name="address" placeholder="Endereço" value={marketData.address} onChange={handleMarketChange} required className="input-style" />
                        <input name="city" placeholder="Cidade" value={marketData.city} onChange={handleMarketChange} required className="input-style" />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Logo do Mercado</h3>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                            {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-md" /> : <Icon name="archive-box" className="w-8 h-8 text-gray-400" />}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition">Anexar Logo</button>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Dados do Responsável (Dono)</h3>
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" placeholder="Nome do Responsável" value={userData.name} onChange={handleUserChange} required className="input-style" />
                        <input name="email" type="email" placeholder="E-mail de Acesso" value={userData.email} onChange={handleUserChange} required className="input-style" />
                        <input name="password" type="password" placeholder="Senha" value={userData.password} onChange={handleUserChange} required className="input-style" />
                        <input name="confirmPassword" type="password" placeholder="Confirmar Senha" value={userData.confirmPassword} onChange={handleUserChange} required className="input-style" />
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                    <button type="submit" disabled={isLoading} className="px-6 py-3 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none disabled:opacity-50">
                        {isLoading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                    </button>
                </div>
            </form>
            {/* FIX: Removed invalid 'jsx' prop from style tag. The 'jsx' prop is specific to 'styled-jsx' and is not a valid attribute in this React setup. */}
            <style>{`
                .input-style {
                    display: block;
                    width: 100%;
                    border-radius: 0.5rem;
                    background-color: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(128, 128, 128, 0.3);
                    padding: 0.75rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                .dark .input-style {
                    background-color: rgba(0, 0, 0, 0.2);
                }
                .input-style:focus {
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    border-color: hsl(221, 83%, 53%);
                    --tw-ring-color: hsl(221, 83%, 53%);
                }
            `}</style>
        </Modal>
    );
};

export default RegistrationModal;
