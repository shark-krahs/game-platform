import {useCallback, useEffect, useState} from "react";

/**
 * Custom hook for localStorage operations with error handling and type safety
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T | null = null,
): [T | null, (value: T | ((val: T | null) => T | null)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T | null>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      console.warn(`Failed to read from localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T | null) => T | null)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (valueToStore === null || valueToStore === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Failed to save to localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Синхронизация между вкладками
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue
            ? (JSON.parse(e.newValue) as T)
            : defaultValue;
          setStoredValue(newValue);
        } catch (error) {
          console.warn(
            `Failed to parse localStorage value for key "${key}":`,
            error,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
}

// Если где-то используется default import — оставляем для совместимости
export default useLocalStorage;
