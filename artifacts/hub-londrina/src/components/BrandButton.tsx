import { forwardRef, useState } from "react";

interface BrandButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  id?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

const SIZE_CLASSES = {
  sm: "text-xs px-4 py-2",
  md: "text-sm px-6 py-2.5",
  lg: "text-base px-7 py-3",
} as const;

const BASE_STYLE: React.CSSProperties = {
  borderRadius: "999px",
  background: "var(--gradient-cta)",
  boxShadow: "var(--shadow-cta)",
  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
};

const HOVER_STYLE: React.CSSProperties = {
  background: "var(--gradient-cta-hover)",
  boxShadow: "var(--shadow-cta-hover)",
};

export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
  function BrandButton(
    { children, onClick, size = "md", className = "", disabled, type = "button", id, style, ...props },
    ref,
  ) {
    const [hovered, setHovered] = useState(false);

    const mergedStyle: React.CSSProperties = {
      ...BASE_STYLE,
      ...(hovered ? HOVER_STYLE : {}),
      ...style,
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        id={id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex items-center justify-center text-white font-bold transition-all duration-200 rounded-full hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0.5 ${SIZE_CLASSES[size]} ${className}`}
        style={mergedStyle}
        {...props}
      >
        {children}
      </button>
    );
  },
);
