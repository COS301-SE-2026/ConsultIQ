import { AuthProvider } from "./hooks/useAuth";
import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';

function App() {

  return (
    <AuthProvider>
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          duration: 2000,
        }}
      />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;