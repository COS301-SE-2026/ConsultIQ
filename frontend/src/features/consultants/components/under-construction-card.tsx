import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";


const faqs = [
  {
    id: 1,
    question: "What is ConsultIQ ?",
    answer:
      "ConsultIQ is a platform that connects skilled consultants with projects and companies looking for their expertise. Once your profile is complete and verified, you'll be matched with relevant opportunities.",
  },
  {
    id: 2,
    question: "How will I know my profile is ready ?",
    answer:
      "You'll receive a notification by email once your profile has been reviewed and approved by your consultant manager. This page will also automatically update to show your full profile.",
  },
  {
    id: 3,
    question: "Can I edit my profile ?",
    answer:
      "Your profile is created and managed by your consultant manager during the onboarding process. If you need any changes, click the edit button, make changes and submit for review. Once your changes have been approved by a consultant manager your changes will be reflected on your profile.",
  },
  {
    id: 4,
    question: "How will I be matched to projects ?",
    answer:
      "Once your profile is active, our system matches you to projects based on your skills, experience, and confidence level for each skill. You'll be notified when a match is found.",
  },
];

/* Barrier icon */
function BarrierIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="8" width="6" height="56" rx="3" fill="#002D62" opacity="0.25" />
      <rect x="52" y="8" width="6" height="56" rx="3" fill="#002D62" opacity="0.25" />
      <rect x="10" y="20" width="52" height="12" rx="3" fill="#002D62" />
      <clipPath id="topBoard">
        <rect x="10" y="20" width="52" height="12" rx="3" />
      </clipPath>
      <g clipPath="url(#topBoard)" opacity="0.35">
        <rect x="6" y="16" width="10" height="24" fill="white" transform="rotate(-20 6 16)" />
        <rect x="24" y="16" width="10" height="24" fill="white" transform="rotate(-20 24 16)" />
        <rect x="42" y="16" width="10" height="24" fill="white" transform="rotate(-20 42 16)" />
        <rect x="60" y="16" width="10" height="24" fill="white" transform="rotate(-20 60 16)" />
      </g>
      <rect x="10" y="40" width="52" height="12" rx="3" fill="#002D62" />
      <clipPath id="bottomBoard">
        <rect x="10" y="40" width="52" height="12" rx="3" />
      </clipPath>
      <g clipPath="url(#bottomBoard)" opacity="0.35">
        <rect x="6" y="36" width="10" height="24" fill="white" transform="rotate(-20 6 36)" />
        <rect x="24" y="36" width="10" height="24" fill="white" transform="rotate(-20 24 36)" />
        <rect x="42" y="36" width="10" height="24" fill="white" transform="rotate(-20 42 36)" />
        <rect x="60" y="36" width="10" height="24" fill="white" transform="rotate(-20 60 36)" />
      </g>
    </svg>
  );
}

/*  FAQ item  */
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  readonly question: string;
  readonly answer: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="border-b px-2 sm:px-4" style={{ borderColor: "var(--color-border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 px-2 sm:px-4 text-left hover:opacity-75 transition-opacity"
      >
        <span className="font-semibold text-[15px] sm:text-[16px] leading-snug" style={{ color: "var(--color-primary)" }}>
          {question}
        </span>
        {isOpen ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>
      {isOpen && (
        <p className="pb-5 text-[14px] sm:text-[15px] leading-relaxed text-balance" style={{ color: "var(--color-text-secondary)" }}>
          {answer}
        </p>
      )}
    </div>
  );
}

/*  Main Card Component  */


export function UnderConstructionCard() {
  const [openId, setOpenId] = useState<number | null>(null);
  const toggle = (id: number) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div
      className="bg-white rounded-2xl w-full max-w-145 mx-auto px-8 pt-14 pb-14 sm:px-12 sm:pt-16 sm:pb-16 flex flex-col gap-8 box-border"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
    >
      {/* Hero section */}
      <div className="flex flex-col items-center text-center gap-6 w-full">
        
        <BarrierIcon />
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-2xl tracking-tight" style={{ color: "var(--color-primary)" }}>
            Hey!
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            Your profile is still under construction.
            <br />
            While you wait, check out our FAQ below.
          </p>
        </div>
      </div>

      {/* Separator Line */}
      <div className="w-full flex justify-center">
        <hr className="w-[90%] border-t" style={{ borderColor: "var(--color-border)" }} />
      </div>

      {/* FAQ Section Wrapper */}
      <div className="flex flex-col gap-6 w-full items-center">
        <h3 className="text-center text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Frequently asked <strong className="font-bold" style={{ color: "var(--color-primary)" }}>Questions</strong>
        </h3>
        
        {/* FAQ list */}
        <div className="flex flex-col gap-4 w-[90%] pb-10">
          {faqs.map((faq) => (
            <FAQItem
              key={faq.id}
              question={faq.question}
              answer={faq.answer}
              isOpen={openId === faq.id}
              onToggle={() => toggle(faq.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}