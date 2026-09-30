import type { ReactNode } from "react";

interface ModalProps {
	readonly open: boolean;
	readonly children: ReactNode;
	readonly labelledBy?: string;
	readonly describedBy?: string;
}

export default function Modal({
	open,
	children,
	labelledBy,
	describedBy,
}: ModalProps) {
	if (!open) return null;

	return (
		<dialog
			open
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
			aria-modal="true"
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
		>
			<div
				className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl"
			>
				{children}
			</div>
		</dialog>
	);
}
