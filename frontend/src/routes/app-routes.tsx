import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "../components/layout/page-transition";

import RegisterUserPage from "../features/authentication/pages/register-user-page";
import { LoginForm } from "../features/authentication/pages/login-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";
import ConsultantsPage from "../features/consultants/pages/consultant-list-page";
import ProjectSpecificationPage from "../features/projects/pages/project-specification-page";
import ProjectListPage from "../features/projects/pages/project-list-page";
import { ProtectedRoute } from "./protected-route";

function AnimatedRoutes() {
  const location = useLocation();
import UnderConstructionPage from "../features/consultants/pages/under-construction-page";
import ConsultantProfileViewPage from "../features/consultants/pages/consultant-profile-view";

import CreateProfilePage from "../features/consultants/pages/create-profile-page";

// Route Guard
import { ProtectedRoute } from "./protected-route";

function AppRoutes() {
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/register" element={<RegisterUserPage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/popia-consent" element={<PopiaConsentPage />} />
            <Route path="/consultants-manager" element={<ConsultantsPage />} />
            <Route path="/project-specification" element={<ProjectSpecificationPage />} />
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/consultant-FAQ" element={<UnderConstructionPage/>}/>
            <Route path="/profile-view" element={<ConsultantProfileViewPage/>}/>
            <Route path="/create-profile" element={<CreateProfilePage />} />
        </Routes>
            <Routes>
                {/* ------------------------------------------- */}
                {/* PUBLIC ROUTES (Accessible to anyone)        */}
                {/* ------------------------------------------- */}
                <Route path="/register" element={<RegisterUserPage />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/set-password" element={<SetPasswordPage />} />
                <Route path="/popia-consent" element={<PopiaConsentPage />} />

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<PageTransition><LoginForm /></PageTransition>} />
        <Route path="/set-password" element={<PageTransition><SetPasswordPage /></PageTransition>} />
        <Route path="/activate" element={<PageTransition><SetPasswordPage /></PageTransition>} />
        <Route path="/popia-consent" element={<PageTransition><PopiaConsentPage /></PageTransition>} />

        {/* Protected routes */}
        <Route path="/register" element={<ProtectedRoute><PageTransition><RegisterUserPage /></PageTransition></ProtectedRoute>} />
        <Route path="/consultants-manager" element={<ProtectedRoute><PageTransition><ConsultantsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project-specification" element={<ProtectedRoute><PageTransition><ProjectSpecificationPage /></PageTransition></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><PageTransition><ProjectListPage /></PageTransition></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );


function AppRoutes() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default AppRoutes;
