import { useMemo } from "react";
import { Button, Modal } from "@heroui/react";
import { diffHunks, type DiffOp } from "../lib/diff";

interface DiscardChangesModalProps {
  isOpen: boolean;
  /** On-disk `guide.mdx` the edit session is anchored to. */
  before: string;
  /** Current edits serialized to MDX. */
  after: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const LINE_STYLES: Record<DiffOp, string> = {
  context: "text-default-500",
  added: "bg-success-50 text-success-800",
  removed: "bg-danger-50 text-danger-800",
};

const LINE_PREFIX: Record<DiffOp, string> = {
  context: " ",
  added: "+",
  removed: "-",
};

/**
 * Confirms a destructive discard by showing the author the exact line-level
 * changes (edited text, added/removed bullets, swapped image paths) between
 * their unsaved edits and the file on disk, so they can decide with full context.
 */
export function DiscardChangesModal({
  isOpen,
  before,
  after,
  onCancel,
  onConfirm,
}: DiscardChangesModalProps) {
  const hunks = useMemo(
    () => (isOpen ? diffHunks(before, after) : []),
    [isOpen, before, after],
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Discard unsaved changes?</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3 text-default-600">
              <p>
                These edits have not been saved to <code>guide.mdx</code>.
                Discarding reverts the editor to the version on disk. This cannot
                be undone.
              </p>
              {hunks.length === 0 ? (
                <p className="text-sm text-default-500">
                  No differences from the file on disk.
                </p>
              ) : (
                <div className="max-h-80 overflow-auto rounded-xl border border-default-200 bg-default-50 font-mono text-xs leading-5">
                  {hunks.map((hunk, hunkIndex) => (
                    <div
                      key={hunkIndex}
                      className="border-b border-default-200 last:border-b-0"
                    >
                      {hunkIndex > 0 && (
                        <div className="bg-default-100 px-3 py-1 text-default-400">
                          ⋯
                        </div>
                      )}
                      {hunk.lines.map((line, lineIndex) => (
                        <div
                          key={lineIndex}
                          className={`whitespace-pre-wrap break-words px-3 ${LINE_STYLES[line.op]}`}
                        >
                          <span className="select-none pr-2 opacity-60">
                            {LINE_PREFIX[line.op]}
                          </span>
                          {line.text || "\u00a0"}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onPress={onCancel}>
                Keep editing
              </Button>
              <Button variant="danger" onPress={onConfirm}>
                Discard changes
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
