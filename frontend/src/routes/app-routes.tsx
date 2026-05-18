import { BrowserRouter, Route, Routes } from "react-router-dom";

import RegisterUserPage from "../features/authentication/pages/register-user-page";
import { LoginForm } from "../features/authentication/pages/login-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";
import ConsultantsPage from "../features/consultants/pages/consultant-list-page";
import ProjectSpecificationPage from "../features/projects/pages/project-specification-page";
import ProjectListPage from "../features/projects/pages/project-list-page";

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
        </Routes>
        </BrowserRouter>
    );
    }
    
    export default AppRoutes;