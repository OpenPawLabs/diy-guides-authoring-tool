import { Button, cn } from "@heroui/react";
import type { StepDraft } from "../../lib/mdx/structuredGuide";

interface StepNavigatorProps {
  steps: StepDraft[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

/**
 * Horizontal step picker driving which step is edited, plus add / reorder / remove
 * controls for the active step.
 */
export function StepNavigator({
  steps,
  activeIndex,
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
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            title={step.title || `Step ${index + 1}`}
            onClick={() => onSelect(index)}
            className={cn(
              "size-9 rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              index === activeIndex
                ? "border-accent bg-accent/15 text-accent shadow-sm"
                : "border-default-200 bg-default-50 text-default-600 hover:border-default-300 hover:text-foreground",
            )}
          >
            {index + 1}
          </button>
        ))}

        <Button size="sm" variant="secondary" onPress={onAdd}>
          + Add step
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          isDisabled={activeIndex <= 0}
          onPress={() => onMove(activeIndex, -1)}
        >
          Move left
        </Button>
        <Button
          size="sm"
          variant="outline"
          isDisabled={activeIndex >= steps.length - 1}
          onPress={() => onMove(activeIndex, 1)}
        >
          Move right
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-danger"
          isDisabled={steps.length <= 1}
          onPress={() => onRemove(activeIndex)}
        >
          Remove step
        </Button>
      </div>
    </div>
  );
}
