import { cn } from "@heroui/react";
import { useEffect, useLayoutEffect, useRef } from "react";

interface InlineEditableProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Seamless inline text editor. Renders an auto-growing textarea that inherits the
 * surrounding typography, so editing happens directly on the rendered guide
 * (plain text; richer MDX stays editable via Raw mode).
 */
export function InlineEditable({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: InlineEditableProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(resize, []);
  useEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      spellCheck
      onChange={(event) => onChange(event.target.value)}
      onInput={resize}
      style={{ font: "inherit", color: "inherit", lineHeight: "inherit" }}
      className={cn(
        "w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-default-400 focus-visible:outline-none",
        className,
      )}
    />
  );
}
