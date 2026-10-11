import { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const BankContext = createContext(null);

export function BankProvider({ children }) {
  const [bank, setBank] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client.get('/bank/metadata')
      .then((response) => {
        if (!cancelled) setBank(response.data.bank);
      })
      .catch((error) => {
        console.error('Could not load bank metadata: ', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <BankContext.Provider value={bank}>{children}</BankContext.Provider>;
}

export function useBank() {
  return useContext(BankContext);
}
