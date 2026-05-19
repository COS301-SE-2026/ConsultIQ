import { useState } from "react";

interface PersonalInfoCardProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <p 
        className="text-sm font-bold font-['Calibri'] leading-5" 
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </p>
      <p 
        className="text-base font-bold font-['Calibri'] leading-6 break-words" 
        style={{ color: "var(--color-text-primary)" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function PersonalInfoCard({ 
  firstName, 
  lastName, 
  email, 
  phone,
}: PersonalInfoCardProps) {
  return (
    <div
      className="w-full rounded-md px-6 pt-6 pb-8 flex flex-col gap-6 outline outline-[0.80px] outline-offset-[-0.80px] outline-slate-200 bg-white"
      style={{ 
        boxShadow: "0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px 0px rgba(0,0,0,0.10)" 
      }}
    >
      {/* Card Header */}
      <div className="w-full flex justify-between items-center">
        <h2
          className="text-xl font-bold font-['Calibri'] leading-7"
          style={{ color: "var(--color-primary)" }}
        >
          Personal information
        </h2>
      </div>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 w-full">
        <ProfileField label="First name" value={firstName} />
        <ProfileField label="Last name" value={lastName} />
        <ProfileField label="Email address" value={email} />
        <ProfileField label="Phone number" value={phone} />
      </div>
    </div>
  );
}

export default PersonalInfoCard;