import { useLocation, Link } from "react-router-dom";
import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";

export default function CheckEmail(){
    const {state}= useLocation();
    const email= (state as any)?.email ?? "";
    
    return(
        <div className="relative min-h-screen bg-surface">
            <div className="hidden lg:block relative w-1/2 h-screen">
            {/* Navy Polygon */}
            <div className="absolute origin-bottom-left bg-[#092352] left-0 bottom-0 h-screen w-[calc(100vh*1.38)] -rotate-[50deg]"/>
            {/* Logo */}
            <div className="relative z-10 "
            style={{top: "30%", left:"60%", transform:"translate(-50%, -50%)"}}>
                <img 
                    src={consultIqLogo}
                    alt="ConsultIQ Logo"
                    className="w-[228px] h-auto object-contain"
                />
            </div>
            </div>
            <div className="absolute left-[50%] top-1/2 -translate-y-1/2 z-10">
                <div className="lg:hidden mb-8 px-8 py-6 rounded-2xl bg-[#092352]">
                <img 
                    src={consultIqLogo}
                    alt="ConsultIQ Logo"
                    className="w-[160px] h-auto object-contain"
                />
            </div>
                <div className="flex flex-col w-[560px] bg-white rounded-lg shadow p-8 gap-4 text-center">
                    <h2>Check your email</h2>
                    <p className="text-lg text-gray-600">We sent a password reset link to <strong>{email || "your email address"}</strong>.</p>
                    <p className="text-lg text-gray-500">If you did not receive it, check your spam or <Link to="/forgot-password" className="!text-primary !underline">try again</Link>.</p>
                </div>
            </div>
        </div>
    )
}