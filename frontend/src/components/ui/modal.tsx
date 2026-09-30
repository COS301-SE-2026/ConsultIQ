import { createPortal } from "react-dom";
import type { MouseEvent, ReactNode } from "react";

interface ModalProps {
	readonly open: boolean;
	readonly children: ReactNode;
	readonly onClose?: () => void;
	readonly labelledBy?: string;
	readonly describedBy?: string;
}

export default function Modal({
	open,
	children,
	onClose,
	labelledBy,
	describedBy,
}: ModalProps) {
	if (!open) return null;

	const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) onClose?.();
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
			role="presentation"
			onMouseDown={handleBackdropMouseDown}
		>
			<div
				className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
			>
				{children}
			</div>
		</div>,
		document.body
	);
}