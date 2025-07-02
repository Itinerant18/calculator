"use client";

export type HistoryItem = {
  id: string;
  type: 'calculator' | 'chat' | 'map';
  data: any;
  timestamp: number;
  name: string;
};

const HISTORY_KEY = 'geocalc_history';

export const getHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const items = window.localStorage.getItem(HISTORY_KEY);
    return items ? JSON.parse(items) : [];
  } catch (error) {
    console.error("Failed to parse history from localStorage", error);
    return [];
  }
};

export const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: new Date().toISOString(),
    timestamp: Date.now(),
  };
  const newHistory = [newItem, ...history];
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  return newHistory;
};

export const deleteHistoryItem = (id: string) => {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newHistory = history.filter(item => item.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  return newHistory;
};

export const clearHistory = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(HISTORY_KEY);
};
