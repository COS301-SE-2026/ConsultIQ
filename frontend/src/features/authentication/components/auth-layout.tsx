import consultIqLogo from "../../../assets/logos/ConsultIQ Logo Dark.png";

    type AuthLayoutProps= {
        readonly children: React.ReactNode;
    }

    function ConsultIqLogo({className}: {readonly className?: string}){
        return(
            <img
            src={consultIqLogo}
            alt="ConsultIQ Logo"
            className={className}/>
        );
    }

export default function AuthLayout({ children }: AuthLayoutProps){  
    return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F4F6FA] p-3 sm:p-4 lg:flex-row lg:justify-start">
        
        <div className="hidden lg:block relative w-1/2 h-screen overflow">
          {/* Navy Polygon */}
          <div className="absolute origin-bottom-left bg-[#092352] left-0 bottom-0 h-screen w-[calc(100vh*1.38)] -rotate-[50deg]"/>
          {/* Logo */}
          <div className="relative z-10 "
          style={{top: "30%", left:"60%", transform:"translate(-50%, -50%)"}}>
              <ConsultIqLogo className="w-[228px] h-auto object-contain"
              />
          </div>
        </div>

    <div className="relative z-10 flex w-full flex-col items-center justify-center px-2 sm:px-0 lg:w-1/2">
        <div className="mb-6 rounded-2xl bg-[#092352] px-6 py-5 sm:mb-8 sm:px-8 sm:py-6 lg:hidden">
          <ConsultIqLogo className="w-[120px] h-auto object-contain sm:w-[160px]"
          />
      </div>
      {children}
      </div>
    </div>  
    )
}