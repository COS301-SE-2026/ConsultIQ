import PopiaConsentForm from "../components/popia-consent-form";

function PopiaConsentPage() {
  return (
    <div
      className="
        min-h-screen
        bg-[var(--color-surface)]
        flex
        items-center
        justify-center
        px-8 
        py-12
      "
    >
      <PopiaConsentForm />
    </div>
  );
}

export default PopiaConsentPage;