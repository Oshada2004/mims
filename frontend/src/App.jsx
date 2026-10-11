import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BankProvider } from './context/BankContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BankProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </BankProvider>
  );
}