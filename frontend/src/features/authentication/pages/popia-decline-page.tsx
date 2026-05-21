import PopiaDeclineForm from "../components/popia-decline-form";

function PopiaDeclinePage() {
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
      <PopiaDeclineForm />
    </div>
  );
}

export default PopiaDeclinePage;