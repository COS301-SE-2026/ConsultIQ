import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';
import { AuthProvider } from "./context/auth-provider";

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
       <AppRoutes />
    </AuthProvider>
  );
}


export default App;