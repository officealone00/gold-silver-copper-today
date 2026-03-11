import { createContext, useContext, useState, type ReactNode } from 'react';

interface PremiumContextValue {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  setPremium: () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setPremium] = useState(false);
  return (
    <PremiumContext.Provider value={{ isPremium, setPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
