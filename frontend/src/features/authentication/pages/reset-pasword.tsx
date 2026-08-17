import { resetPassword } from "../../../api/auth.api";
import {useSearchParams} from "react-router-dom";
import AuthLayout from "../components/auth-layout";
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
    <AuthLayout>
        <PasswordForm 
        email={email}
        token={token}
        title="Set a new password"
        description= "Enter a new password to finish resetting your account."
        submitLabel= "Save Password"
        successRedirect={`/login?email=${encodeURIComponent(email)}`}
        successMessage="Your password has been updated."
        onSubmit={({password}) =>resetPassword({email, token, password})}/>
    </AuthLayout>
  );
}
