import { activateAccount } from "../../../api/auth.api";
import {useSearchParams} from "react-router-dom";
import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";

import PasswordForm from "../components/password-form";

function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email= searchParams.get("email");
  const token= searchParams.get("token");

  if(!email || !token){
    return(
      <div className="relative min-h-screen bg-[#F4F6FA]">
        <p className="text-center pt-24 text-white">Invalid activation link.</p>
      </div>
    );
  }

  return (
    <div
      className=" relative min-h-screen bg-[#F4F6FA] ">
    
    {/* Navy Polygon */}
    <div
      className="absolute origin-bottom-left bg-[#092352] left-0 bottom-0 h-screen w-[calc(100vh*1.38)] -rotate-[50deg]"
    />

      {/* Logo */}
      <div className="absolute left-[70px]  top-1/3 -translate-y-1/2 z-10 ">
        <div className="bg-[#0B255C]/30 px-10 py-8 rounded-2xl backdrop-blur-sm">
          <img 
            src={consultIqLogo}
            alt="ConsultIQ Logo"
            className=" w-[228px] h-[152px] object-contain  "/>
        </div>
      </div>

      {/* Gold Glow */}
      <div
        className="
          absolute
          left-[53%]
          top-1/2
          -translate-x-[10%]
          -translate-y-1/2
          w-[565px]
          h-[575px]
          rounded-full
          blur-[90px]
          pointer-events-none
        "
        style={{
          backgroundColor:
            "rgba(201, 168, 76, 0.38)",
        }}
      />

      {/* Form Container */}
      <div
        className="absolute left-[50%] top-1/2 -translate-y-1/2 z-10 ">
        <PasswordForm 
        email={email}
        token={token}
        title="Create your password"
        description= "Create your password to activate your account."
        submitLabel= "Set Password"
        successRedirect={`/popia-consent?email=${encodeURIComponent(email)}`}
        successMessage="Your account is now active."
        onSubmit={({password}) =>activateAccount({email, token, password})}/>
      </div>
    </div>
  );
}

export default SetPasswordPage;