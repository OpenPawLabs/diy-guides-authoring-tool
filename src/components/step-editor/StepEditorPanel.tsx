import { useState } from "react";
import {
  createBlankStep,
  type GuideDraft,
  type StepDraft,
} from "../../lib/mdx/structuredGuide";
import { GuideOverviewForm } from "../GuideOverviewForm";
import { GuideStepEditor } from "./GuideStepEditor";
import { StepNavigator, type StepSelection } from "./StepNavigator";

interface StepEditorPanelProps {
  draft: GuideDraft;
  directory: FileSystemDirectoryHandle;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
  /** Tab to open on mount (restored from persistence); defaults to Overview. */
  initialSelection?: StepSelection;
  /** Reports the active tab so it can be persisted and restored after a refresh. */
  onSelectionChange?: (selection: StepSelection) => void;
}

/**
 * Primary editing surface: a selector over the rendered `GuideStep` for the active
 * step, plus an Overview tab for guide-level intro, tools, and callouts. Owns the
 * current selection and brokers step-scoped draft edits.
 */
export function StepEditorPanel({
  draft,
  directory,
  updateDraft,
  initialSelection = "overview",
  onSelectionChange,
}: StepEditorPanelProps) {
  const [selection, setSelection] = useState<StepSelection>(initialSelection);
  const select = (next: StepSelection) => {
    setSelection(next);
    onSelectionChange?.(next);
  };
  const steps = draft.steps;
  const activeIndex =
    typeof selection === "number" ? Math.min(selection, steps.length - 1) : -1;
  const activeStep = steps[activeIndex] as StepDraft | undefined;

  const addStep = () => {
    updateDraft((next) => {
      next.steps.push(createBlankStep());
    });
    select(steps.length);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) {
      return;
    }
    updateDraft((next) => {
      const [moved] = next.steps.splice(index, 1);
      next.steps.splice(target, 0, moved);
    });
    select(target);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      return;
    }
    updateDraft((next) => {
      next.steps.splice(index, 1);
    });
    select(Math.max(0, index - 1));
  };

  const onStepChange = (mutate: (step: StepDraft) => void) =>
    updateDraft((next) => {
      const step = next.steps[activeIndex];
      if (step) {
        mutate(step);
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <StepNavigator
        steps={steps}
        active={selection === "overview" ? "overview" : activeIndex}
        onSelect={select}
        onAdd={addStep}
        onMove={moveStep}
        onRemove={removeStep}
      />

      {selection === "overview" ? (
        <GuideOverviewForm draft={draft} updateDraft={updateDraft} />
      ) : activeStep ? (
        <div className="rounded-xl border border-default-200 bg-background p-5 shadow-sm">
          <GuideStepEditor
            key={activeStep.id}
            step={activeStep}
            stepNumber={activeIndex + 1}
            directory={directory}
            onStepChange={onStepChange}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-default-300 p-6 text-center text-sm text-default-600">
          No steps yet. Add the first step to start building the guide.
        </p>
      )}
    </div>
  );
}
