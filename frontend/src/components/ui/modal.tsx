import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import type { ReactNode, MouseEvent } from "react";

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
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open) {
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => onClose?.();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
		if (event.target === dialogRef.current) onClose?.();
	};

	return createPortal(
		<dialog
			ref={dialogRef}
			className="rounded-xl bg-white p-8 shadow-xl backdrop:bg-black/50"
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			onClick={handleDialogClick}
		>
			{children}
		</dialog>,
		document.body
	);
}