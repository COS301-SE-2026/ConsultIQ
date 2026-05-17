import { BrowserRouter, Route, Routes } from "react-router-dom";

import RegisterUserPage from "../features/authentication/pages/register-user-page";
import SetPasswordPage from "../features/authentication/pages/set-password-page";
import PopiaConsentPage from "../features/authentication/pages/popia-consent-page";

function AppRoutes() {
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/register" element={<RegisterUserPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/popia-consent" element={<PopiaConsentPage />} />
        </Routes>
        </BrowserRouter>
    );
    }
    
    export default AppRoutes;