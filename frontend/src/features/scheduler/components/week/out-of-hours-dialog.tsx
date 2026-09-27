interface OutOfHoursDialogProps{
    readonly isWeekend?: boolean;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

export default function OutOfHoursConfirmDialog({isWeekend =false, onConfirm,onCancel}:OutOfHoursDialogProps){
    return(
        <div className="fixed inset z-50 flex items-center justify-center">
            <button 
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/30 cursor-default"
                onClick={onCancel}
            />

            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="ooh-title"
                className=" relative w-80 bg-white rounded-lg shadow-lg p-4 flex flex-col gap-3" 
            >
                <h2 id="ooh-title" className="text-sm font-bold text-slate-800">Outside core hours</h2>
                <p className="text-sm text-slate-700">
                    This is {isWeekend ? "on a weekend" : "outside core hours (08:00-16:00)"}. It will be tagged,
                    counted toward your weekly hours, and no overtime compensation applies.
                </p>
                <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 text-sm  rounded border border-slate-300" onClick={onCancel}>Cancel</button>
                    <button className="px-3 py-1 text-sm rounded bg-[#002D62] text-white" onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );

}