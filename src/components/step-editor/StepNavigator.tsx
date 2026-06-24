import { Button, cn } from "@heroui/react";
import type { StepDraft } from "../../lib/mdx/structuredGuide";

/** Active selection in the navigator: the Overview tab or a zero-based step index. */
export type StepSelection = "overview" | number;

interface StepNavigatorProps {
  steps: StepDraft[];
  active: StepSelection;
  onSelect: (selection: StepSelection) => void;
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

/**
 * Horizontal selector driving the editing surface: an Overview tab for guide-level
 * details (intro, tools, callouts) followed by the numbered steps, plus add /
 * reorder / remove controls for the active step.
 */
export function StepNavigator({
  steps,
  active,
  onSelect,
  onAdd,
  onMove,
  onRemove,
}: StepNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="tablist"
        aria-label="Guide steps"
      >
        <Tab
          isActive={active === "overview"}
          label="Overview"
          onSelect={() => onSelect("overview")}
          className="px-3"
        />

        {steps.map((step, index) => (
          <Tab
            key={step.id}
            isActive={active === index}
            label={`${index + 1}`}
            title={step.title || `Step ${index + 1}`}
            onSelect={() => onSelect(index)}
            className="size-9"
          />
        ))}

        <Button size="sm" variant="secondary" onPress={onAdd}>
          + Add step
        </Button>
      </div>

      {typeof active === "number" && (
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            isDisabled={active <= 0}
            onPress={() => onMove(active, -1)}
          >
            Move left
          </Button>
          <Button
            size="sm"
            variant="outline"
            isDisabled={active >= steps.length - 1}
            onPress={() => onMove(active, 1)}
          >
            Move right
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-danger"
            isDisabled={steps.length <= 1}
            onPress={() => onRemove(active)}
          >
            Remove step
          </Button>
        </div>
      )}
    </div>
  );
}

function Tab({
  isActive,
  label,
  title,
  className,
  onSelect,
}: {
  isActive: boolean;
  label: string;
  title?: string;
  className?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      title={title}
      onClick={onSelect}
      className={cn(
        "h-9 rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isActive
          ? "border-accent bg-accent/15 text-accent shadow-sm"
          : "border-default-200 bg-default-50 text-default-600 hover:border-default-300 hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
