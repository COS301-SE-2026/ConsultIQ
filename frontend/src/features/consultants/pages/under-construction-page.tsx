import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";



/*  FAQ data  */
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


function BarrierIcon() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
     
      <rect x="14" y="8" width="6" height="56" rx="3" fill="#002D62" opacity="0.25" />
     
      <rect x="52" y="8" width="6" height="56" rx="3" fill="#002D62" opacity="0.25" />

     
      <rect x="10" y="20" width="52" height="12" rx="3" fill="#002D62" />
     
      <clipPath id="topBoard">
        <rect x="10" y="20" width="52" height="12" rx="3" />
      </clipPath>
      <g clipPath="url(#topBoard)" opacity="0.35">
        <rect x="6"  y="16" width="10" height="24" rx="0" fill="white" transform="rotate(-20 6 16)" />
        <rect x="24" y="16" width="10" height="24" rx="0" fill="white" transform="rotate(-20 24 16)" />
        <rect x="42" y="16" width="10" height="24" rx="0" fill="white" transform="rotate(-20 42 16)" />
        <rect x="60" y="16" width="10" height="24" rx="0" fill="white" transform="rotate(-20 60 16)" />
      </g>

      
      <rect x="10" y="40" width="52" height="12" rx="3" fill="#002D62" />
      
      <clipPath id="bottomBoard">
        <rect x="10" y="40" width="52" height="12" rx="3" />
      </clipPath>
      <g clipPath="url(#bottomBoard)" opacity="0.35">
        <rect x="6"  y="36" width="10" height="24" rx="0" fill="white" transform="rotate(-20 6 36)" />
        <rect x="24" y="36" width="10" height="24" rx="0" fill="white" transform="rotate(-20 24 36)" />
        <rect x="42" y="36" width="10" height="24" rx="0" fill="white" transform="rotate(-20 42 36)" />
        <rect x="60" y="36" width="10" height="24" rx="0" fill="white" transform="rotate(-20 60 36)" />
      </g>
    </svg>
  );
}


function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left transition-opacity hover:opacity-75"
        style={{
          background: "none",
          border: "none",
          padding: "20px 0",
          cursor: "pointer",
          gap: "12px",
        }}
      >
        <span
          className="font-semibold"
          style={{ color: "var(--color-primary)", fontSize: "16px" }}
        >
          {question}
        </span>
        {isOpen ? (
          <ChevronUp size={20} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={20} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        )}
      </button>

      {isOpen && (
        <p
          style={{
            paddingBottom: "20px",
            color: "var(--color-text-secondary)",
            fontSize: "15px",
            lineHeight: "1.65",
          }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}


function UnderConstructionPage() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header
          className="bg-white flex items-center"
          style={{
            height: "90px",
            padding: "0 40px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h1
            className="font-bold"
            style={{ color: "var(--color-primary)", fontSize: "32px" }}
          >
            My Profile
          </h1>
        </header>

        {/* Main card */}
        <main
          className="flex-1 flex items-center justify-center"
          style={{ padding: "60px 48px" }}
        >
          <div
            className="bg-white rounded-2xl w-full"
            style={{
              maxWidth: "560px",
              padding: "48px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            
            <div
              className="flex flex-col items-center text-center"
              style={{ marginBottom: "32px" }}
            >
              <BarrierIcon />

              <p
                className="font-bold"
                style={{
                  color: "var(--color-primary)",
                  fontSize: "22px",
                  marginTop: "20px",
                  marginBottom: "10px",
                }}
              >
                Hey
              </p>

              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "15px",
                  lineHeight: "1.65",
                }}
              >
                Your profile is still under construction.
                <br />
                While you wait check out our FAQ.
              </p>
            </div>

            
            <hr style={{ borderColor: "var(--color-border)", marginBottom: "28px" }} />

            {/* FAQ heading */}
            <p
              className="text-center"
              style={{
                fontSize: "20px",
                color: "var(--color-text-primary)",
                marginBottom: "4px",
              }}
            >
              Frequently asked{" "}
              <strong style={{ color: "var(--color-primary)" }}>Questions</strong>
            </p>

            {/* FAQ list */}
            <div style={{ marginTop: "8px" }}>
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
        </main>
      </div>
    </div>
  );
}

export default UnderConstructionPage;