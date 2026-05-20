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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/register" element={<PageTransition><RegisterUserPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginForm /></PageTransition>} />
        <Route path="/set-password" element={<PageTransition><SetPasswordPage /></PageTransition>} />
        <Route path="/activate" element={<PageTransition><SetPasswordPage /></PageTransition>} />
        <Route path="/popia-consent" element={<PageTransition><PopiaConsentPage /></PageTransition>} />
        <Route path="/consultants-manager" element={<PageTransition><ConsultantsPage /></PageTransition>} />
        <Route path="/project-specification" element={<PageTransition><ProjectSpecificationPage /></PageTransition>} />
        <Route path="/projects" element={<PageTransition><ProjectListPage /></PageTransition>} />
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