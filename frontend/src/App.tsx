import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
       <AppRoutes />
    </> 
  );
}


export default App;