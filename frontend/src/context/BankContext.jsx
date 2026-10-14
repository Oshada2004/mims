import { createContext, useContext } from 'react';
import { useApi } from '../api/useApi';
import { getMetadata } from '../api/services/bankService';

const BankContext = createContext(null);
export function BankProvider({ children }) {
  const { data: bank } = useApi((signal) => getMetadata({ signal }), []);

  return <BankContext.Provider value={bank}>{children}</BankContext.Provider>;
}

export function useBank() {
  return useContext(BankContext);
}