import AppRoutes from "./routes/app-routes";
import { Toaster } from 'sonner';
import { AuthProvider } from './hooks/useAuth';
import { useEffect } from "react";
import * as PusherPushNotifications from '@pusher/push-notifications-web';

function App() {
  useEffect(() => {
    //Push Notifications beam api client
    const beamsClient = new PusherPushNotifications.Client({
      instanceId: '3351b29b-f8cd-4822-8b1a-23fd3e60b201',
    });
    // start client and prompt user to grant permissions for notifications
    beamsClient.start()
      .then(() => beamsClient.addDeviceInterest('hello'))
      .then(() => console.log('Successfully registered and subscribed!'))
      .catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <Toaster
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