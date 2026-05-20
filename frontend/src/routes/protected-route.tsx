
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth();

    // If they don't have a valid token in context, kick them to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If they are authenticated, render the nested child routes
    return <Outlet />;
};
