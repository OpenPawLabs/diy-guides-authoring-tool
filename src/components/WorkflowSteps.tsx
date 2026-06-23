import { Card } from "@heroui/react";

const steps = [
  "Clone a guide repository locally.",
  "Open this authoring tool in Chrome.",
  "Grant access to a chapter folder.",
  "Let the tool create or confirm guide.mdx.",
  "Use git outside the tool to review, commit, and push.",
];

export function WorkflowSteps() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Local-first workflow</Card.Title>
        <Card.Description>
          Phase 1 focuses on connecting the hosted app to a local chapter
          folder. Editing and preview arrive in Phase 2.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li
              className="flex gap-3 rounded-xl border border-default-200 bg-white p-4"
              key={step}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm text-default-700">{step}</span>
            </li>
          ))}
        </ol>
      </Card.Content>
    </Card>
  );
}
