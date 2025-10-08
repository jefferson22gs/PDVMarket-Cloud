
import { useState, useEffect, useRef } from 'react';

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
