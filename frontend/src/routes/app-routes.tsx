import {
    BrowserRouter,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";

import { AnimatePresence } from "framer-motion";

import PageTransition from "../components/layout/page-transition";

// Authentication
import RegisterUserPage from "../features/authentication/pages/register-user-page";
import  LoginPage  from "../features/authentication/pages/login-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";

// Consultants
import ConsultantsPage from "../features/consultants/pages/consultant-list-page";
import UnderConstructionPage from "../features/consultants/pages/under-construction-page";
import ConsultantProfileViewPage from "../features/consultants/pages/consultant-profile-view";
import CreateProfilePage from "../features/consultants/pages/create-profile-page";

// Projects
import ProjectSpecificationPage from "../features/projects/pages/project-specification-page";
import ProjectListPage from "../features/projects/pages/project-list-page";

// Route Guard
import { ProtectedRoute } from "./protected-route";

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Public Routes */}
                <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
                <Route path="/set-password" element={<PageTransition><SetPasswordPage /></PageTransition>} />
                <Route path="/activate" element={<PageTransition><SetPasswordPage /></PageTransition>} />
                <Route path="/popia-consent" element={<PageTransition><PopiaConsentPage /></PageTransition>} />

                {/* Protected Routes */}
                <Route path="/register" element={<ProtectedRoute><PageTransition><RegisterUserPage /></PageTransition></ProtectedRoute>} />
                <Route path="/consultants-manager" element={<ProtectedRoute><PageTransition><ConsultantsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/project-specification" element={<ProtectedRoute><PageTransition><ProjectSpecificationPage /></PageTransition></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><PageTransition><ProjectListPage /></PageTransition></ProtectedRoute>} />
                <Route path="/consultant-FAQ" element={<ProtectedRoute><PageTransition><UnderConstructionPage /></PageTransition></ProtectedRoute>} />
                <Route path="/profile-view" element={<ProtectedRoute><PageTransition><ConsultantProfileViewPage /></PageTransition></ProtectedRoute>} />
                <Route path="/create-profile" element={<ProtectedRoute><PageTransition><CreateProfilePage /></PageTransition></ProtectedRoute>} />
            </Routes>
        </AnimatePresence>
    );
}

function AppRoutes() {
    return (
        <BrowserRouter>
            <AnimatedRoutes />
        </BrowserRouter>
    );
}

export default AppRoutes;
