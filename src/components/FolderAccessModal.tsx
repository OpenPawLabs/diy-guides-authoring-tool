import { Button, Modal } from "@heroui/react";

interface FolderAccessModalProps {
  isOpen: boolean;
  folderName?: string;
  onAllowAccess: () => void;
  onCancel: () => void;
}

/**
 * Prompts the author to re-grant read/write access to a stored guide folder.
 * The grant must happen inside the click on "Allow Access" so Chrome shows its
 * native permission prompt.
 */
export function FolderAccessModal({
  isOpen,
  folderName,
  onAllowAccess,
  onCancel,
}: FolderAccessModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={() => {}}>
      <Modal.Backdrop isDismissable={false} isKeyboardDismissDisabled>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Re-authorize folder access</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-default-600">
              <p>
                Chrome no longer has access to{" "}
                <span className="font-medium text-default-900">
                  {folderName ?? "this guide folder"}
                </span>
                . Grant access again to keep editing this guide.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-3">
              <Button variant="outline" onPress={onCancel}>
                Back to guides
              </Button>
              <Button variant="primary" onPress={onAllowAccess}>
                Allow Access
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
