import { useState } from "react";
import {
  createBlankStep,
  type GuideDraft,
  type StepDraft,
} from "../../lib/mdx/structuredGuide";
import { GuideStepEditor } from "./GuideStepEditor";
import { StepNavigator } from "./StepNavigator";

interface StepEditorPanelProps {
  draft: GuideDraft;
  directory: FileSystemDirectoryHandle;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
}

/**
 * Primary editing surface: a step selector over the rendered `GuideStep` for the
 * active step. Owns which step is selected and brokers step-scoped draft edits.
 */
export function StepEditorPanel({
  draft,
  directory,
  updateDraft,
}: StepEditorPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const steps = draft.steps;
  const clampedIndex = steps.length ? Math.min(activeIndex, steps.length - 1) : 0;
  const activeStep = steps[clampedIndex] as StepDraft | undefined;

  const addStep = () => {
    updateDraft((next) => {
      next.steps.push(createBlankStep());
    });
    setActiveIndex(steps.length);
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
    setActiveIndex(target);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      return;
    }
    updateDraft((next) => {
      next.steps.splice(index, 1);
    });
    setActiveIndex(Math.max(0, index - 1));
  };

  const onStepChange = (mutate: (step: StepDraft) => void) =>
    updateDraft((next) => {
      const step = next.steps[clampedIndex];
      if (step) {
        mutate(step);
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <StepNavigator
        steps={steps}
        activeIndex={clampedIndex}
        onSelect={setActiveIndex}
        onAdd={addStep}
        onMove={moveStep}
        onRemove={removeStep}
      />

      {activeStep ? (
        <div className="rounded-xl border border-default-200 bg-background p-5 shadow-sm">
          <GuideStepEditor
            key={activeStep.id}
            step={activeStep}
            stepNumber={clampedIndex + 1}
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
