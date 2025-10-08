






import { useState, useEffect, useRef, useCallback } from 'react';

// Hook for managing dark mode
export const useDarkMode = (): [string, () => void] => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    return [theme, toggleTheme];
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts: { [key: string]: () => void }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const handler = shortcuts[event.key];
            if (handler) {
                event.preventDefault();
                handler();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [shortcuts]);
};


// Hook for declarative interval
export const useInterval = (callback: () => void, delay: number | null) => {
  // Fix: Initialize useRef with the callback to ensure it's always defined and to resolve a potential type inference issue.
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      // The ref is guaranteed to be defined.
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// Hook for playing sound effects using Web Audio API
export const useSoundEffects = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext on first use, handling browser policies
    const getAudioContext = () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
                return null;
            }
        }
        // Resume context if it was suspended (e.g., due to user interaction policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const playSound = useCallback((type: 'add' | 'success' | 'error' | 'clear') => {
        const audioContext = getAudioContext();
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // Start with a decent volume

        switch (type) {
            case 'add': // Short, higher-pitched blip
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // A5 note
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
                break;
            case 'success': // Ascending cheerful sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioContext.currentTime + 0.3); // C6
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
                break;
            case 'error': // Low, short buzz
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
                break;
            case 'clear': // Descending "whoosh" like sound
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
                oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
                break;
        }

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }, []);

    return { playSound };
};

// Hook to debounce a callback function
export const useDebouncedCallback = <A extends any[]>(
  callback: (...args: A) => void,
  delay: number
) => {
  // Fix: Initialize useRef with null to provide an argument, resolving the error.
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup the timeout if the component unmounts
    return () => {
      // window.clearTimeout handles null/undefined values gracefully.
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: A) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback;
};