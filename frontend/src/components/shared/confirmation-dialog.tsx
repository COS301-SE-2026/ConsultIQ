import { AlertTriangle } from "lucide-react";
import Modal from "../ui/modal";
import { Button } from "../ui/button";

interface ConfirmationDialogProps {
	readonly open: boolean;
	readonly title: string;
	readonly description: string;
	readonly confirmLabel?: string;
	readonly cancelLabel?: string;
	readonly loading?: boolean;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
}

export default function ConfirmationDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	loading = false,
	onConfirm,
	onCancel,
}: ConfirmationDialogProps) {
	if (!open) return null;

	return (
		<Modal
			open={open}
			onClose={loading ? undefined : onCancel}
			labelledBy="confirmation-dialog-title"
			describedBy="confirmation-dialog-description"
		>
				<div className="mb-4 flex items-center gap-3">
					<AlertTriangle className="h-7 w-7 shrink-0 text-red-600" />
					<h2 id="confirmation-dialog-title" className="text-xl font-bold text-slate-900">
						{title}
					</h2>
				</div>

				<p id="confirmation-dialog-description" className="mb-8 text-sm text-slate-600">
					{description}
				</p>

				<div className="flex justify-end gap-3">
					<Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
						{cancelLabel}
					</Button>
					<Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
						{loading ? "Processing..." : confirmLabel}
					</Button>
				</div>
		</Modal>
	);
}
