import { Button, Modal } from "@heroui/react";

interface DiskConflictModalProps {
  isOpen: boolean;
  onKeepEdits: () => void;
  onReloadFromDisk: () => void;
}

/**
 * Shown when `guide.mdx` changed on disk while the editor has unsaved edits.
 * The author resolves the conflict by keeping their in-memory edits (which will
 * overwrite the file on the next save) or reloading the newer file from disk.
 */
export function DiskConflictModal({
  isOpen,
  onKeepEdits,
  onReloadFromDisk,
}: DiskConflictModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={() => {}}>
      <Modal.Backdrop isDismissable={false} isKeyboardDismissDisabled>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>This guide changed on disk</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-default-600">
              <p>
                The <code>guide.mdx</code> file was modified outside the editor
                while you had unsaved changes. Choose which version to keep.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onPress={onReloadFromDisk}>
                Reload from disk
              </Button>
              <Button variant="primary" onPress={onKeepEdits}>
                Keep my edits
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
