import { Button, Modal } from "@heroui/react";
import { MediaCropEditor, type MediaDisplayRegion } from "@openpawlabs/diy-guides-ui";

interface CropEditorModalProps {
  isOpen: boolean;
  /** Displayable source for the image being cropped. */
  src: string;
  /** Current 4:3 region in source pixels, or undefined for the default center crop. */
  region?: MediaDisplayRegion;
  onClose: () => void;
  /** Set a new region, or `undefined` to fall back to the center crop. */
  onChange: (region: MediaDisplayRegion | undefined) => void;
}

/**
 * Modal chrome around the library's `MediaCropEditor`. The editor owns all
 * source-pixel geometry and reports the chosen 4:3 region; this modal adds the
 * explanation, a "reset to center crop" action, and persistence. A `MediaFigure`
 * with no `displayRegion` center-crops a non-4:3 source, so clearing the region
 * is the documented way back to the default.
 */
export function CropEditorModal({
  isOpen,
  src,
  region,
  onClose,
  onChange,
}: CropEditorModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="cover">
          <Modal.Dialog className="flex max-h-[100dvh] flex-col">
            <Modal.Header className="shrink-0">
              <Modal.Heading>Adjust crop</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <p className="max-w-prose text-sm text-default-600">
                  Drag the box or its corners to choose the 4:3 region shown in the
                  guide. Non-4:3 photos are center-cropped until you set a region.
                </p>
                <Button
                  variant="secondary"
                  isDisabled={region == null}
                  onPress={() => onChange(undefined)}
                >
                  Reset to center crop
                </Button>
              </div>
              <div
                className="flex min-h-0 w-full flex-1 items-center justify-center"
                style={{ containerType: "size" }}
              >
                <MediaCropEditor
                  className="w-[min(100cqw,calc(100cqh*var(--crop-aspect,1)))]"
                  src={src}
                  region={region}
                  onChange={onChange}
                />
              </div>
            </Modal.Body>
            <Modal.Footer className="shrink-0">
              <Button variant="primary" onPress={onClose}>
                Done
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
