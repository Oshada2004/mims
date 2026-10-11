import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const BankContext = createContext(null);

export function BankProvider({ children }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/bank/metadata`)
      .then((response) => setMetadata(response.data.data))
      .catch((requestError) => {
        console.error('Unable to load bank metadata:', requestError);
        setError('Bank information is currently unavailable.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <BankContext.Provider value={{ metadata, loading, error }}>
      {children}
    </BankContext.Provider>
  );
}

export function useBankMetadata() {
  return useContext(BankContext);
}
