import { cn } from "@heroui/react";
import { COLORS } from "@openpawlabs/diy-guides-ui";
import {
  bulletVariants,
  guideColors,
  type GuideBulletVariant,
  type GuideColor,
} from "../../lib/mdx/structuredGuide";

interface BulletMarkerMenuProps {
  variant: GuideBulletVariant;
  color: GuideColor;
  onSelectColor: (color: GuideColor) => void;
  onSelectVariant: (variant: GuideBulletVariant) => void;
}

const colorLabels: Record<GuideColor, string> = {
  GREY: "Grey",
  RED: "Red",
  ORANGE: "Orange",
  YELLOW: "Yellow",
  GREEN: "Green",
  LIGHT_BLUE: "Light blue",
  BLUE: "Blue",
  MAGENTA: "Magenta",
};

const semanticVariants = bulletVariants.filter((variant) => variant !== "dot");

const variantLabels: Record<GuideBulletVariant, string> = {
  dot: "Dot",
  caution: "Caution",
  reminder: "Reminder",
  note: "Note",
  button: "Button",
};

/**
 * Picker shown when a bullet marker is pressed: choose a dot color (which sets the
 * bullet to the `dot` variant) or switch to a semantic variant (note / reminder /
 * caution).
 */
export function BulletMarkerMenu({
  variant,
  color,
  onSelectColor,
  onSelectVariant,
}: BulletMarkerMenuProps) {
  return (
    <div className="w-56 rounded-lg border border-default-200 bg-background p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-default-500">Dot color</p>
      <div className="grid grid-cols-8 gap-1.5">
        {guideColors.map((option) => {
          const isActive = variant === "dot" && color === option;
          return (
            <button
              key={option}
              type="button"
              title={colorLabels[option]}
              aria-label={colorLabels[option]}
              aria-pressed={isActive}
              onClick={() => onSelectColor(option)}
              className={cn(
                "size-5 rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-default-300",
              )}
              style={{ backgroundColor: COLORS[option] }}
            />
          );
        })}
      </div>

      <p className="mb-1.5 mt-3 text-xs font-semibold text-default-500">Style</p>
      <div className="flex flex-col gap-0.5">
        {semanticVariants.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={variant === option}
            onClick={() => onSelectVariant(option)}
            className={cn(
              "rounded-md px-2 py-1 text-left text-sm transition hover:bg-default-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              variant === option && "bg-default-100 font-medium",
            )}
          >
            {variantLabels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
