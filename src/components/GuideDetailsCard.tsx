import { Card } from "@heroui/react";
import {
  guideDifficulties,
  type GuideDifficulty,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";
import { SelectField, TextField } from "./GuideFormFields";

interface GuideDetailsCardProps {
  draft: GuideDraft;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
  lastModified?: number;
}

/**
 * Compact guide-level header form (title, difficulty, time, meta) shown above the
 * editor, with the on-disk last-modified timestamp for context. Intro, tools, and
 * callouts live in the step navigator's Overview tab.
 */
export function GuideDetailsCard({
  draft,
  updateDraft,
  lastModified,
}: GuideDetailsCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Guide details</Card.Title>
        {lastModified != null && (
          <Card.Description>Last modified {formatDate(lastModified)}</Card.Description>
        )}
      </Card.Header>
      <Card.Content>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Title"
            value={draft.header.title}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.title = value;
              })
            }
          />
          <SelectField
            label="Difficulty"
            value={draft.header.difficulty}
            options={guideDifficulties}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.difficulty = value as GuideDifficulty;
              })
            }
          />
          <TextField
            label="Time estimate"
            value={draft.header.timeEstimate}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.timeEstimate = value;
              })
            }
          />
          <TextField
            label="Meta"
            value={draft.header.meta}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.meta = value;
              })
            }
          />
        </div>
      </Card.Content>
    </Card>
  );
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
