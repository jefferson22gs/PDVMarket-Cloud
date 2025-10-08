import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, LoadingSpinner } from './common';
import { useToast } from '../App';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (scannedCode: string) => void;
}

const isBarcodeDetectorSupported = 'BarcodeDetector' in window;

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        let animationFrameId: number;

        const startScan = async () => {
            if (!isOpen) return;

            if (!isBarcodeDetectorSupported) {
                const message = "Seu navegador não suporta a detecção de código de barras.";
                setError(message);
                addToast({ message, type: 'error' });
                onClose();
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                
                setIsLoading(false);

                // @ts-ignore - BarcodeDetector might not be in default TS lib
                const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });

                const detectBarcode = async () => {
                    if (videoRef.current && videoRef.current.readyState >= 2) {
                        try {
                            const barcodes = await barcodeDetector.detect(videoRef.current);
                            if (barcodes.length > 0 && barcodes[0].rawValue) {
                                onScanSuccess(barcodes[0].rawValue);
                                return; // Stop scanning after success
                            }
                        } catch (e) {
                            console.error("Barcode detection failed:", e);
                            // Don't set error here, it might be a temporary glitch. Let it retry.
                        }
                    }
                    animationFrameId = requestAnimationFrame(detectBarcode);
                };
                
                detectBarcode();

            } catch (err) {
                console.error("Camera access error:", err);
                let message = "Erro ao acessar a câmera. Verifique as permissões.";
                if (err instanceof Error && err.name === 'NotAllowedError') {
                    message = "Permissão da câmera negada. Habilite o acesso nas configurações do seu navegador.";
                }
                setError(message);
                setIsLoading(false);
            }
        };

        startScan();

        return () => {
            cancelAnimationFrame(animationFrameId);
            stopCamera();
        };
    }, [isOpen, onClose, onScanSuccess, addToast, stopCamera]);


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Escanear Código de Barras" size="md">
            <div className="p-4 relative aspect-video bg-black flex items-center justify-center">
                {isLoading && <LoadingSpinner text="Iniciando câmera..." />}
                {error && <div className="text-center text-red-500 p-4">{error}</div>}
                <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${isLoading || error ? 'hidden' : 'block'}`}
                    playsInline
                    muted
                />
                 {!isLoading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full h-1/2 border-4 border-dashed border-red-500/70 rounded-lg" />
                    </div>
                 )}
            </div>
        </Modal>
    );
};

export default BarcodeScannerModal;
