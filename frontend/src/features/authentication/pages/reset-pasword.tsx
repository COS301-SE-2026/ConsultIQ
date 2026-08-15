import { resetPassword } from "../../../api/auth.api";
import {useSearchParams} from "react-router-dom";
import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";

import PasswordForm from "../components/password-form";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email= searchParams.get("email") ?? "";
  const token= searchParams.get("token") ?? "";

  if(!email || !token){
    return(
      <div className="relative min-h-screen bg-[#F4F6FA]">
        <p className="text-center pt-24 text-white">Invalid reset link.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start bg-[#F4F6FA] overflow-hidden p-4">
        
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

    <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-center justify-center">
        <div className="lg:hidden mb-8 px-8 py-6 rounded-2xl bg-[#092352]">
          <img 
            src={consultIqLogo}
            alt="ConsultIQ Logo"
            className="w-[160px] h-auto object-contain"
          />
      </div>
        <PasswordForm 
        email={email}
        token={token}
        title="Set a new password"
        description= "Enter a new password to finish resetting your account."
        submitLabel= "Save Password"
        successRedirect={`/login?email=${encodeURIComponent(email)}`}
        successMessage="Your password has been updated."
        onSubmit={({password}) =>resetPassword({email, token, password})}/>
      </div>
    </div>
  );
}
