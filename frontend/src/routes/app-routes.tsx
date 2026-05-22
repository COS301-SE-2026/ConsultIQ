import { BrowserRouter, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import PageTransition from "../components/layout/page-transition";

// Authentication
import RegisterUserPage from "../features/authentication/pages/register-user-page";
import LoginForm from "../features/authentication/pages/login-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";
import PopiaDeclinePage from "../features/authentication/pages/popia-decline-page";

// Consultants
import ConsultantsPage from "../features/consultants/pages/consultant-list-page";
import UnderConstructionPage from "../features/consultants/pages/under-construction-page";
import ConsultantProfileViewPage from "../features/consultants/pages/consultant-profile-view";
import CreateProfilePage from "../features/consultants/pages/create-profile-page";

// Project pages (Added missing imports)
import ProjectSpecificationPage from "../features/projects/pages/project-specification-page";
import ProjectListPage from "../features/projects/pages/project-list-page";

import { AuthProvider } from "../hooks/useAuth";
import { ProtectedRoute } from "./protected-route";

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* ------------------------------------------- */}
                {/* PUBLIC ROUTES                               */}
                {/* ------------------------------------------- */}
                <Route path="/login" element={<PageTransition><LoginForm /></PageTransition>} />
                <Route path="/set-password" element={<PageTransition><SetPasswordPage /></PageTransition>} />
                <Route path="/activate" element={<PageTransition><SetPasswordPage /></PageTransition>} />
                <Route path="/popia-consent" element={<PageTransition><PopiaConsentPage /></PageTransition>} />
                <Route path="/popia-decline" element={<PageTransition><PopiaDeclinePage /></PageTransition>} />

                {/* ------------------------------------------- */}
                {/* PROTECTED ROUTES                            */}
                {/* ------------------------------------------- */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/register" element={<PageTransition><RegisterUserPage /></PageTransition>} />
                    <Route path="/consultants-manager" element={<PageTransition><ConsultantsPage /></PageTransition>} />
                    <Route path="/project-specification" element={<PageTransition><ProjectSpecificationPage /></PageTransition>} />
                    <Route path="/projects" element={<PageTransition><ProjectListPage /></PageTransition>} />
                    <Route path="/consultant-FAQ" element={<PageTransition><UnderConstructionPage /></PageTransition>} />
                    <Route path="/profile-view" element={<PageTransition><ConsultantProfileViewPage /></PageTransition>} />
                    <Route path="/create-profile/:userId" element={<ProtectedRoute><PageTransition><CreateProfilePage /></PageTransition></ProtectedRoute>} />                </Route>

                {/* Catch-all: Redirect unknown URLs to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </AnimatePresence>
    );
}

function AppRoutes() {
    return (
        <AuthProvider>
            <BrowserRouter>
                {/* Swapped the old static markup out for your animated wrapper component */}
                <AnimatedRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default AppRoutes;