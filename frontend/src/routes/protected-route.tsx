import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/use-auth';
import { type UserRole } from '../types/global.types';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
       const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (!user) return <Navigate to="/" replace />;

    if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};