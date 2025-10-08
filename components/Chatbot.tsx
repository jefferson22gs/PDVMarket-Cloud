
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/api';
import type { User, ChatMessage, ChatSession } from '../types';
// FIX: Corrected import path for common components.
import { Modal, Icon } from './common';
import { useToast } from '../App';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const { addToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const initializeChat = async () => {
            if (isOpen && !chatSession) {
                setIsLoading(true);
                try {
                    const session = await geminiService.startChatSession(user.market_id);
                    if (session) {
                        setChatSession(session);
                        setMessages([{
                            role: 'model',
                            text: `Olá, ${user.name}! Sou o Marky, seu assistente virtual. Como posso ajudar hoje?`
                        }]);
                    } else {
                         setMessages([{
                            role: 'model',
                            text: 'Desculpe, o serviço de chat não está disponível. Verifique se a chave de API do Gemini está configurada.'
                        }]);
                         addToast({ message: 'API Key do Gemini não configurada.', type: 'error' });
                    }
                } catch (error) {
                    addToast({ message: 'Falha ao iniciar o assistente.', type: 'error' });
                } finally {
                    setIsLoading(false);
                }
            }
        };
        initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, user, addToast]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatSession) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatSession.chat.sendMessage({ message: input });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            addToast({ message: 'Erro ao comunicar com o assistente.', type: 'error' });
            const errorMessage: ChatMessage = { role: 'model', text: 'Desculpe, não consegui processar sua solicitação.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Assistente Virtual" size="xl">
            <div className="flex flex-col h-[70vh]">
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">M</div>}
                            <div
                                className={`max-w-md p-3 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-none'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                    }`}
                            >
                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                         <motion.div
                            className="flex items-end gap-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                           <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">M</div>
                           <div className="max-w-md p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none flex items-center gap-2">
                             <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                             <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                             <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                           </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite sua pergunta..."
                            className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                            disabled={isLoading || !chatSession}
                        />
                        <button
                            type="submit"
                            className="p-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            disabled={isLoading || !input.trim() || !chatSession}
                        >
                           <Icon name="paper-airplane" className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            </div>
        </Modal>
    );
};

export default Chatbot;
