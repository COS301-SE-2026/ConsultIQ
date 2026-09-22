import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';

function App() {

  return (
    <>
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          duration: 2000,
        }}
      />
      <AppRoutes />
    </>
  );
}

export default App;