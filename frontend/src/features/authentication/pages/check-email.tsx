import { useLocation, Link } from "react-router-dom";
import AuthLayout from "../components/auth-layout";

type LocationState= {
    email: string;
}

export default function CheckEmail(){
    const {state}= useLocation();
    const email= (state as LocationState | null)?.email ?? "";
    
    return(
        <AuthLayout>
            <div className="flex flex-col w-[560px] bg-white rounded-lg shadow p-8 gap-4 text-center">
                <h2>Check your email</h2>
                <p className="text-lg text-gray-600">We sent a password reset link to <strong>{email || "your email address"}</strong>.</p>
                <p className="text-lg text-gray-500">If you did not receive it, check your spam or <Link to="/forgot-password" className="!text-primary !underline">try again</Link>.</p>
            </div>
        </AuthLayout>
    )
}