import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BankProvider } from './context/BankContext';
import { PreferencesProvider } from './context/PreferencesContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BankProvider>
      <AuthProvider>
        <PreferencesProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PreferencesProvider>
      </AuthProvider>
    </BankProvider>
  );
}