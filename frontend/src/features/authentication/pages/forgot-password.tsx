import {useState} from "react";
import {useNavigate} from "react-router-dom";
import AuthLayout from "../components/auth-layout";
import { forgotPassword } from "../../../api/auth.api"; 

function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading]= useState(false);
    const [info, setInfo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent){
        e.preventDefault();
        if (!email.trim()) return setError("Please enter your email address.");
        setLoading(true);
        setError(null);
        try{
            await forgotPassword({email});
            setInfo("If that account exists, a reset link was sent to the email address.");
            navigate("/check-email", {state: {email}} );
        }catch(err){
            setError((err as Error).message || "An error has occured, please try again.");
        }finally{
            setLoading(false);
        }
    }

  return (
      <AuthLayout>
        <form onSubmit={handleSubmit} className="flex flex-col w-[560px] bg-white rounded-lg shadow p-8 gap-4">
            <h1 className="font-bold"> Forgot Password</h1>
            <p className="text-sm text-primary" > Enter your email address and we will send a reset link </p>
            <input 
            type="email"
            value={email}
            onChange={(e) =>setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="w-full h-[48px] px-4 rounded border border-secondary outline-none"
            required />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {info && <p className="text-green-600 text-sm">{info}</p>}

            <button type="submit" disabled={loading}
             className="w-full h-[48px] mt-2 rounded text-lg text-white font-bold"
             style={{backgroundColor: "var(--color-primary)"}}>
                {loading ? "Sending..." : "Send reset link"}
            </button>
        </form>
      </AuthLayout>
  );
}

export default ForgotPasswordPage;