import React from "react";

interface ResizeHandleProps{
    edge: "top" | "bottom";
    onPointerDown: (e: React.PointerEvent) => void;
}

export default function ResizeHandle({edge, onPointerDown}: ResizeHandleProps){
    return(
        <div
            onPointerDown={onPointerDown}
            onClick={(e) => e.stopPropagation()}
            className={`absolute left-0 right-0 h-1.5 cursor-ns-resize z-10 ${edge === "top" ? "top-0" : "bottom-0"}`}
        />
    );
}