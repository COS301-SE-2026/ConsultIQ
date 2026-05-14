import { BrowserRouter, Route, Routes } from "react-router-dom";

import RegisterUserPage from "../features/authentication/pages/register-user-page";
import { ValidationForm } from "../features/authentication/pages/validation-page";

function AppRoutes() {
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/register" element={<RegisterUserPage />} />
            <Route path="/validate" element={<ValidationForm />} />
        </Routes>
        </BrowserRouter>
    );
    }
    
    export default AppRoutes;