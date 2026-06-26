import { Card } from "@heroui/react";
import {
  guideDifficulties,
  type GuideDifficulty,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";
import { GuideImageField } from "./GuideImageField";
import { SelectField, TextField } from "./GuideFormFields";

interface GuideDetailsCardProps {
  draft: GuideDraft;
  directory: FileSystemDirectoryHandle;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
  lastModified?: number;
}

/**
 * Compact guide-level header form (title, hero image, difficulty, time, meta) shown
 * above the editor, with the on-disk last-modified timestamp for context. Intro,
 * tools, and callouts live in the step navigator's Overview tab.
 */
export function GuideDetailsCard({
  draft,
  directory,
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
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <GuideImageField
            directory={directory}
            src={draft.header.heroImage}
            label="Hero image"
            size="hero"
            previewAspect
            onChange={(src) =>
              updateDraft((next) => {
                if (src) {
                  next.header.heroImage = src;
                } else {
                  delete next.header.heroImage;
                  delete next.header.heroImageAlt;
                }
              })
            }
          />
          <div className="min-w-0 flex-1">
            <TextField
              label="Hero image alt text"
              value={draft.header.heroImageAlt ?? ""}
              onChange={(value) =>
                updateDraft((next) => {
                  if (value) {
                    next.header.heroImageAlt = value;
                  } else {
                    delete next.header.heroImageAlt;
                  }
                })
              }
            />
          </div>
        </div>

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
