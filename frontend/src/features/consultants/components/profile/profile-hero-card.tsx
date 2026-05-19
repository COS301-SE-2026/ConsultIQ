interface ProfileHeroCardProps {
  firstName: string;
  lastName: string;
  status: "Available" | "Unavailable";
}

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

function ProfileHeroCard({ firstName, lastName, status }: ProfileHeroCardProps) {
  const isAvailable = status === "Available";

  return (
    <div className="self-stretch h-32 px-6 pt-6 pb-[0.80px] bg-white rounded-md shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.10)] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10)] outline outline-[0.80px] outline-offset-[-0.80px] outline-slate-200 inline-flex flex-col justify-start items-start"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="self-stretch h-20 inline-flex justify-start items-center gap-4">
        {/* Avatar */}
        <div  className="size-20 bg-gradient-to-br from-slate-600/95 via-slate-600/95 via 7% to-sky-950 rounded-full flex justify-center items-center">
            <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
                >
                {getInitials(firstName, lastName)}
            </div>  
        </div>
       

        {/* Name + badge */}
        <div className="flex-1 h-16 relative">
             <div className="w-[604.76px] h-8 left-0 top-0 absolute">
                  <p className="left-0 top-[-0.20px] absolute justify-start text-sky-950 text-2xl font-bold font-['Calibri'] leading-8" >
                    {firstName} {lastName}
                </p>
             </div>
             <div className="w-20 h-7 left-0 top-[35.99px] absolute bg-orange-400/10 rounded-sm">
                <span
                    className="left-[12px] top-[2.80px] absolute justify-start text-sm font-bold font-['Calibri'] leading-5"
                    style={{
                    backgroundColor: isAvailable ? "#FEF3C7" : "#F3F4F6",
                    color: isAvailable ? "#92400E" : "var(--color-text-secondary)",
                    }}
                >
                    {status}
                </span>
             </div>
          
        </div>
      </div>
    </div>
  );
}

export default ProfileHeroCard;


