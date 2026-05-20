import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface WelcomeModalProps {
  show: boolean;
  onContinue: () => void;
}

function WelcomeModal({ show, onContinue }: WelcomeModalProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!show || fired.current) return;
    fired.current = true;

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.2, y: 0.6 },
      colors: ["#1F3A8C", "#C9A84C", "#ffffff"],
    });
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.8, y: 0.6 },
      colors: ["#1F3A8C", "#C9A84C", "#ffffff"],
    });
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl px-16 py-14 flex flex-col items-center gap-6 max-w-[520px] w-full text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-2"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              🎉
            </div>

            <h1 className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
              Welcome to ConsultIQ!
            </h1>

            <p className="text-base leading-7" style={{ color: "var(--color-text-secondary)" }}>
              Your account is all set up and ready to go. We're excited to have
              you on board. Let's get started.
            </p>

            <button
              onClick={onContinue}
              className="mt-4 w-full h-[52px] rounded-xl text-white font-bold text-lg transition hover:brightness-110"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              Get Started
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WelcomeModal;