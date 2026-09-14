import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";
import { LoginCard } from '../components/login-card';

function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F4F6FA] p-3 sm:p-4 lg:flex-row lg:justify-start">

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

    <div className="relative z-10 flex w-full flex-col items-center justify-center px-2 sm:px-0 lg:w-1/2">
        <div className="mb-6 rounded-2xl bg-[#092352] px-6 py-5 sm:mb-8 sm:px-8 sm:py-6 lg:hidden ">
          <img 
            src={consultIqLogo}
            alt="ConsultIQ Logo"
            className="w-[160px] h-auto object-contain"
          />
      </div>
      <LoginCard/>
    </div>


      {/* Gold Glow */}
      <div
        className="hidden lg:block absolute left-[53%] top-1/2 -translate-x-[10%] -translate-y-1/2 w-[565px] h-[575px] rounded-full blur-[90px] pointer-events-none"
        style={{
          backgroundColor: "rgba(201, 168, 76, 0.38)",
        }}
      />
    </div>
  );
}

export default LoginPage;