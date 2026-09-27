import React from "react";

interface ResizeHandleProps{
    readonly edge: "top" | "bottom";
    readonly onPointerDown: (e: React.PointerEvent) => void;
}

export default function ResizeHandle({edge, onPointerDown}: ResizeHandleProps){
    return(
        <div
            onPointerDown={onPointerDown}
            onClick={(e) => e.stopPropagation()}
            className={`absolute left-0 right-0 h-1.5 cursor-ns-resize z-10 touch-none ${edge === "top" ? "top-0" : "bottom-0"}`}
        />
    );
}