import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

// Auth Pages (Public)
import RegisterUserPage from "../features/authentication/pages/register-user-page";
import { LoginForm } from "../features/authentication/pages/login-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";

// Protected Pages (Require Login)
import ConsultantsPage from "../features/consultants/pages/consultant-list-page";
import ProjectSpecificationPage from "../features/projects/pages/project-specification-page";
import ProjectListPage from "../features/projects/pages/project-list-page";
import CreateProfilePage from "../features/consultants/pages/create-profile-page";

// Route Guard
import { ProtectedRoute } from "./protected-route";
import { AuthProvider } from "../hooks/useAuth";

function AppRoutes() {
    return (
        <AuthProvider>
            <BrowserRouter>
            <Routes>
                {/* ------------------------------------------- */}
                {/* PUBLIC ROUTES (Accessible to anyone)        */}
                {/* ------------------------------------------- */}
                <Route path="/register" element={<RegisterUserPage />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/set-password" element={<SetPasswordPage />} />
                <Route path="/popia-consent" element={<PopiaConsentPage />} />

                {/* ------------------------------------------- */}
                {/* PROTECTED ROUTES (Requires Authentication)  */}
                {/* ------------------------------------------- */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/consultants-manager" element={<ConsultantsPage />} />
                    <Route path="/project-specification" element={<ProjectSpecificationPage />} />
                    <Route path="/projects" element={<ProjectListPage />} />
                    <Route path="/create-profile" element={<CreateProfilePage />} />
                </Route>

                {/* Catch-all: Redirect unknown URLs to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppRoutes;