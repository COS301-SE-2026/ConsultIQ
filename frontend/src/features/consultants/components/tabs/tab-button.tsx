type  Props = {
    readonly label: string;
    readonly active?: boolean;
    readonly onClick: () => void;
};

export default function TabButton({
    label,
    active,
    onClick,
}: Props) {
    return (
        <button
            onClick={onClick}
            className={`
                relative
                pb-4
                text-[18px]
                font-semibold
                transition-colors
                duration-200

                ${
                    active
                        ? "text-[#002D72]"
                        : "text-slate-500 hover:text-slate-700"
                }
            `}
        >
            {label}

            {active && (
                <div
                    className="
                        absolute
                        left-0
                        bottom-0
                        h-[3px]
                        w-full
                        rounded-full
                        bg-[#002D72]
                    "
                />
            )}
        </button>
    );
}