interface OutOfHoursDialogProps{
    readonly isWeekend?: boolean;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

function openAsModal(el: HTMLDialogElement | null){
    if(el && !el.open) el.showModal();
}

export default function OutOfHoursConfirmDialog({isWeekend =false, onConfirm,onCancel}:OutOfHoursDialogProps){
    return(
        <dialog 
            ref={openAsModal}
            aria-labelledby="ooh-title"
            onCancel={(e) => {
                e.preventDefault();
                onCancel();
            }}
            className="m-auto w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-4 shadow-lg backdrop:bg-black/30"
        >

            <div className="flex flex-col gap-3" >
                <h2 id="ooh-title" className="text-sm font-bold text-slate-800">Outside core hours</h2>
                <p className="text-sm text-slate-700">
                    This is {isWeekend ? "on a weekend" : "outside core hours (07:00-16:00)"}. It will be tagged,
                    counted toward your weekly hours, and no overtime compensation applies.
                </p>
                <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 text-sm  rounded border border-slate-300" onClick={onCancel}>Cancel</button>
                    <button className="px-3 py-1 text-sm rounded bg-[#002D62] text-white" onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </dialog>
    );

}