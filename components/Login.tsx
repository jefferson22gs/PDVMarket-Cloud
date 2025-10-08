
import React, { useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { useToast } from '../App';
import RegistrationModal from './RegistrationModal';

interface LoginViewProps {
    onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('dono@pdv.com');
    const [password, setPassword] = useState('123');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const user = await api.login(email, password);
            if (user) {
                onLogin(user);
            } else {
                addToast({ message: 'E-mail ou senha incorretos.', type: 'error' });
            }
        } catch (error) {
            console.error('Login error:', error);
            addToast({ message: 'Falha ao tentar fazer login.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">PDVMarket Cloud</h1>
                    <p className="text-indigo-200">Gestão rápida, inteligente e acessível.</p>
                </div>
                <div className="glass-effect rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-white/80 text-sm font-bold mb-2" htmlFor="email">
                                E-mail
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                                placeholder="dono@pdv.com"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-white/80 text-sm font-bold mb-2" htmlFor="password">
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 focus:outline-none focus:shadow-outline transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </div>
                         <p className="text-center text-xs text-white/60 mt-4">
                            Use dono@pdv.com / 123 para Dono ou joao@pdv.com / 123 para Operador.
                        </p>
                    </form>
                    <p className="text-center text-white/80 mt-6">
                        Não tem uma conta?{' '}
                        <button onClick={() => setIsRegisterModalOpen(true)} className="font-bold hover:underline">
                            Cadastre-se
                        </button>
                    </p>
                </div>
            </div>
            <RegistrationModal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                onRegisterSuccess={(user) => {
                    setIsRegisterModalOpen(false);
                    onLogin(user);
                }}
            />
        </div>
    );
};

export default LoginView;