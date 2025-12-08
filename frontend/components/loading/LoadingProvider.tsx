'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SecoraLoader } from './SecoraLoader';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) setProgress(0);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, progress, setProgress }}>
      {isLoading && (
        <SecoraLoader
          progress={progress}
          onComplete={() => setLoading(false)}
        />
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}
