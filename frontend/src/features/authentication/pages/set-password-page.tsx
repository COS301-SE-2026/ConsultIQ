import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";

//import SetPasswordForm from "../components/set-password-form";

function SetPasswordPage() {
  return (
    <div
      className=" relative min-h-screen  overflow-hidden bg-[#F4F6FA] ">
    
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
        className="absolute w-[525px] h-[585px]  right-[160px] top-[52px] bg-[#C9A84C]/40 blur-[80px] rounded-full "/>

      {/* Form Container */}
      <div
        className="absolute right-[140px] top-[64px] z-10 ">
        {/* <SetPasswordForm /> */}
      </div>
    </div>
  );
}

export default SetPasswordPage;