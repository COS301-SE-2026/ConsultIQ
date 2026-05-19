import * as React from "react";

import { cn } from "../../lib/utils";

type InputProps =
  React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    `
                    flex
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-4
                    py-2
                    text-sm
                    outline-none
                    transition

                    placeholder:text-slate-400

                    focus:border-[#002D72]
                    focus:ring-2
                    focus:ring-[#002D72]/20

                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    `,
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export { Input };