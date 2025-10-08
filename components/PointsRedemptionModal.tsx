
import React, { useState, useMemo, useEffect } from 'react';
import type { Customer } from '../types';
// FIX: Corrected import path for common components.
import { Modal } from './common';

interface PointsRedemptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
    cartTotal: number;
    onRedeem: (pointsToRedeem: number, discountAmount: number) => void;
}

const POINTS_TO_BRL_RATE = 0.10; // 1 point = R$ 0.10, so 10 points = R$ 1.00

const PointsRedemptionModal: React.FC<PointsRedemptionModalProps> = ({ isOpen, onClose, customer, cartTotal, onRedeem }) => {
    const [pointsToUse, setPointsToUse] = useState('');

    useEffect(() => {
        // Reset input when modal opens/closes or customer changes
        setPointsToUse('');
    }, [isOpen, customer]);
    
    const maxPointsToUse = useMemo(() => {
        const pointsForFullDiscount = Math.ceil(cartTotal / POINTS_TO_BRL_RATE);
        return Math.min(customer.points, pointsForFullDiscount);
    }, [customer.points, cartTotal]);

    const discountAmount = useMemo(() => {
        const points = parseInt(pointsToUse) || 0;
        if (points > maxPointsToUse) {
            return maxPointsToUse * POINTS_TO_BRL_RATE;
        }
        return points * POINTS_TO_BRL_RATE;
    }, [pointsToUse, maxPointsToUse]);

    const handlePointsInputChange = (value: string) => {
        const numericValue = parseInt(value) || 0;
        if (numericValue > customer.points) {
            setPointsToUse(String(customer.points));
        } else if (numericValue < 0) {
            setPointsToUse('0');
        } else {
            setPointsToUse(value);
        }
    };
    
    const handleSubmit = () => {
        const points = parseInt(pointsToUse) || 0;
        if (points > 0 && points <= maxPointsToUse) {
            onRedeem(points, discountAmount);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resgatar Pontos de Fidelidade">
            <div className="p-6 space-y-4">
                <div className="text-center bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Cliente: {customer.name}</p>
                    <p className="text-2xl font-bold text-primary">{customer.points} <span className="text-lg">pontos disponíveis</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Taxa: 10 pontos = R$ 1,00</p>
                </div>

                <div>
                    <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pontos a utilizar</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="number"
                            name="points"
                            id="points"
                            value={pointsToUse}
                            onChange={(e) => handlePointsInputChange(e.target.value)}
                            className="block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 p-3 text-lg font-bold focus:border-primary focus:ring-primary"
                            placeholder="0"
                            max={maxPointsToUse}
                            autoFocus
                        />
                         <div className="absolute inset-y-0 right-0 flex items-center">
                            <button onClick={() => setPointsToUse(String(maxPointsToUse))} className="h-full rounded-r-md border-0 bg-transparent py-0 pl-2 pr-4 text-primary font-semibold hover:text-primary/80">
                                Usar Máx
                            </button>
                        </div>
                    </div>
                    {parseInt(pointsToUse) > maxPointsToUse && (
                        <p className="mt-2 text-sm text-red-600">O máximo de pontos para esta compra é {maxPointsToUse}.</p>
                    )}
                </div>
                
                <div className="text-center py-2">
                    <p className="text-gray-600 dark:text-gray-400">Isso resultará em um desconto de:</p>
                    <p className="text-3xl font-extrabold text-green-600">R$ {discountAmount.toFixed(2)}</p>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                    <button onClick={handleSubmit} disabled={!pointsToUse || parseInt(pointsToUse) <= 0 || parseInt(pointsToUse) > maxPointsToUse} className="px-6 py-3 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                        Aplicar Desconto
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PointsRedemptionModal;
