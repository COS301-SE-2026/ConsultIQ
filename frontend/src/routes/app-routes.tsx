import { BrowserRouter, Route, Routes } from "react-router-dom";

import RegisterUserPage from "../features/authentication/pages/register-user-page";
import { LoginForm } from "../features/authentication/pages/login-page";

function AppRoutes() {
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/register" element={<RegisterUserPage />} />
            <Route path="/login" element={<LoginForm />} />
        </Routes>
        </BrowserRouter>
    );
    }
    
    export default AppRoutes;