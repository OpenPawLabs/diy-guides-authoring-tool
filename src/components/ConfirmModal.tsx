import type { ReactNode } from "react";
import { Button, Modal } from "@heroui/react";

interface ConfirmModalProps {
  isOpen: boolean;
  heading: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Accent for the confirm button; destructive actions use `danger` (default). */
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A small confirmation dialog for destructive actions that have no other safety
 * net (removing a whole step, forgetting a guide and its unsaved draft). The
 * diff-aware {@link DiscardChangesModal} stays separate; this is for actions
 * where a line diff would not add clarity.
 */
export function ConfirmModal({
  isOpen,
  heading,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{heading}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-default-600">{body}</Modal.Body>
            <Modal.Footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onPress={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={tone} onPress={onConfirm}>
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
