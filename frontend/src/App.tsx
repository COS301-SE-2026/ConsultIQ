import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
        }}
      />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;