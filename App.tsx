import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User, View, ToastMessage } from './types';
import { useDarkMode } from './hooks';
import LoginView from './components/Login';
import PDVView from './components/PDV';
import AdminView from './components/AdminView';
import KitchenView from './components/KitchenView';
import Chatbot from './components/Chatbot';
import { Toast, Icon } from './components/common';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext<{ addToast: (msg: ToastMessage) => void; }>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

const App: React.FC = () => {
    const [theme, toggleTheme] = useDarkMode();
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<View>('login');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const addToast = useCallback((msg: ToastMessage) => {
        const id = Date.now();
        setToasts(prev => [...prev, { ...msg, id }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, msg.duration || 3000);
    }, []);

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        setView(loggedInUser.type === 'owner' ? 'admin' : 'pdv');
        addToast({ message: `Bem-vindo(a), ${loggedInUser.name}!`, type: 'success' });
    };

    const handleLogout = () => {
        if (window.confirm('Deseja realmente sair?')) {
            setUser(null);
            setView('login');
            setIsChatOpen(false); // Close chat on logout
            addToast({ message: 'Você saiu com sucesso.', type: 'info' });
        }
    };

    const switchView = (newView: View) => {
        if (user?.type !== 'owner' && (newView === 'admin' || newView === 'kitchen')) {
            addToast({ message: 'Acesso negado.', type: 'error' });
            return;
        }
        setView(newView);
    };

    const renderView = () => {
        switch (view) {
            case 'login':
                return <LoginView onLogin={handleLogin} />;
            case 'pdv':
                return user ? <PDVView user={user} onSwitchView={switchView} onLogout={handleLogout} /> : <LoginView onLogin={handleLogin} />;
            case 'admin':
                 return user ? <AdminView user={user} onSwitchView={switchView} onLogout={handleLogout} /> : <LoginView onLogin={handleLogin} />;
            case 'kitchen':
                return user ? <KitchenView user={user} onSwitchView={switchView} onLogout={handleLogout} /> : <LoginView onLogin={handleLogin} />;
            default:
                return <LoginView onLogin={handleLogin} />;
        }
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            <div className={`min-h-screen font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300`}>
                <div className="fixed top-4 right-4 z-50">
                    <button
                        onClick={() => toggleTheme()}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderView()}
                  </motion.div>
                </AnimatePresence>

                {/* Global Chatbot */}
                {user && (
                    <>
                        <motion.button
                            onClick={() => setIsChatOpen(true)}
                            className="fixed bottom-4 right-4 z-40 w-16 h-16 bg-primary rounded-full text-white flex items-center justify-center shadow-lg hover:bg-primary/90"
                            aria-label="Abrir assistente virtual"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Icon name="chat-bubble" className="w-8 h-8"/>
                        </motion.button>
                        <Chatbot 
                            isOpen={isChatOpen} 
                            onClose={() => setIsChatOpen(false)}
                            user={user}
                        />
                    </>
                )}


                <div className="fixed bottom-4 right-24 z-[100] w-full max-w-xs space-y-2">
                    {toasts.map(toast => (
                        <Toast key={toast.id} message={toast.message} type={toast.type} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

export default App;