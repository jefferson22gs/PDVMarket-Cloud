import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icon Component ---
// A simple SVG icon component. In a real app, this would use a library like heroicons.
const ICONS: { [key: string]: React.ReactNode } = {
    'chat-bubble': <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72-3.72a1.5 1.5 0 0 1 0-2.121l3.72-3.72ZM15.75 14.25l-3.72-3.72a1.5 1.5 0 0 1 0-2.121l3.72-3.72c-.884.284-1.5 1.128-1.5 2.097v4.286c0 1.136.847 2.1 1.98 2.193Z" />,
    'chart-bar': <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />,
    'shopping-cart': <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.823a.75.75 0 0 0-.11-.63l-1.32-1.59a.75.75 0 0 0-.586-.25H5.15a.75.75 0 0 0-.586.25L3.234 6.823a.75.75 0 0 0-.11.63l1.823 6.823Z" />,
    'archive-box': <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />,
    'user-group': <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.742-.584M14.25 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 15.75a9.094 9.094 0 0 1 3.742-.584M12 15.75a9.094 9.094 0 0 0-3.742-.584M12 15.75v3.25A1.5 1.5 0 0 0 13.5 21h6a1.5 1.5 0 0 0 1.5-1.5v-3.25m-1.5-.584A9.094 9.094 0 0 0 18 18.72m-6 0A9.094 9.094 0 0 1 6 18.72m-3.742-.584A9.094 9.094 0 0 1 6 15.75" />,
    'users': <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.53-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-4.663M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
    'cog': <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226M12 20.25a.75.75 0 100-1.5.75.75 0 000 1.5zm1.13-1.04a4.5 4.5 0 00-4.5-4.5H8.63a.75.75 0 000 1.5h.007a3 3 0 013 3v.006a.75.75 0 001.5 0v-.006zm-7.13-7.13a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm-1.12.536a4.5 4.5 0 01-2.036-3.444V8.63a.75.75 0 00-1.5 0v.007a6 6 0 002.7 5.222.75.75 0 001.06-.062l.061-.106a4.5 4.5 0 013.444-2.035h.007a.75.75 0 000-1.5h-.007a3 3 0 00-3-3z" />,
    'exclamation-triangle': <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />,
    'fire': <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />,
    'arrow-down-tray': <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />,
    'document-text': <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
    'paper-airplane': <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />,
    'x-mark': <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
};

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        {ICONS[name] || null}
    </svg>
);


// --- Toast Component ---
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
    const baseClasses = 'p-4 rounded-lg shadow-lg text-sm font-medium flex items-center';
    const typeClasses = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-white',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.5 }}
            className={`${baseClasses} ${typeClasses[type]}`}
        >
            {message}
        </motion.div>
    );
};


// --- Modal Component ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    if (typeof document === 'undefined') return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden glass-effect`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }}
                        exit={{ scale: 0.9, opacity: 0 }}
                    >
                        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Icon name="x-mark" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </header>
                        <div className="overflow-y-auto flex-1">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
