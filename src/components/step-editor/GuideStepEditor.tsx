import {
  GuideStep,
  LinkButton,
  MediaFigure,
  type GuideStepMediaEditing,
  type MediaDisplayRegion,
} from "@openpawlabs/diy-guides-ui";
import { useRef, useState } from "react";
import { useResolvedImageSrcs } from "../../hooks/useResolvedImageSrc";
import { writeDownloadFile, writeImageFile } from "../../lib/fs/guideFiles";
import {
  createBlankBullet,
  createBlankLinkItem,
  createStepMedia,
  MAX_STEP_MEDIA,
  type GuideBulletVariant,
  type GuideColor,
  type LinkItemDraft,
  type StepDraft,
} from "../../lib/mdx/structuredGuide";
import { AnnotationEditorModal } from "./AnnotationEditorModal";
import { CropEditorModal } from "./CropEditorModal";
import { BulletMarkerMenu } from "./BulletMarkerMenu";
import { InlineEditable } from "./InlineEditable";
import { LinkItemMenu } from "./LinkItemMenu";

interface GuideStepEditorProps {
  step: StepDraft;
  stepNumber: number;
  directory: FileSystemDirectoryHandle;
  onStepChange: (mutate: (step: StepDraft) => void) => void;
}

type PendingDownload = { bulletId: string; index: number };

const MENU_WIDTH = 224;
const MENU_HEIGHT = 224;
const LINK_MENU_WIDTH = 288;
const LINK_MENU_HEIGHT = 232;
const MENU_GAP = 8;

/** Track which index the active selection lands on after a thumbnail is moved. */
function indexAfterMove(current: number, from: number, to: number): number {
  if (current === from) return to;
  if (from < current && current <= to) return current - 1;
  if (to <= current && current < from) return current + 1;
  return current;
}

/**
 * Anchor a popover near the pointer while keeping it fully inside the viewport,
 * so a marker pressed near an edge shifts the menu in instead of clipping it off.
 */
function anchorMenu(x: number, y: number, width: number, height: number) {
  const clamp = (value: number, extent: number) =>
    Math.max(MENU_GAP, Math.min(value, extent - MENU_GAP));
  return {
    left: clamp(x, window.innerWidth - width),
    top: clamp(y + 10, window.innerHeight - height),
  };
}

/**
 * Renders the real `GuideStep` as the editing surface for one step: inline title
 * and bullet text, a marker dropdown for color/variant, a "+ New bullet" control,
 * and image upload via the library's media affordances.
 */
export function GuideStepEditor({
  step,
  stepNumber,
  directory,
  onStepChange,
}: GuideStepEditorProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ bulletId: string; x: number; y: number } | null>(
    null,
  );
  const [linkMenu, setLinkMenu] = useState<{
    bulletId: string;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const pointerRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);
  const downloadPendingRef = useRef<PendingDownload | null>(null);

  const resolvedSrcs = useResolvedImageSrcs(
    directory,
    step.media.map((item) => item.src),
  );

  const activeIndex = step.media.length
    ? Math.min(activeMediaIndex, step.media.length - 1)
    : 0;

  const handleAddFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      const room = Math.max(MAX_STEP_MEDIA - step.media.length, 0);
      const srcs: string[] = [];
      for (const file of files.slice(0, room)) {
        srcs.push(await writeImageFile(directory, file));
      }
      onStepChange((draft) => {
        for (const src of srcs) {
          if (draft.media.length < MAX_STEP_MEDIA) {
            draft.media.push(createStepMedia(src));
          }
        }
      });
      setActiveMediaIndex(step.media.length);
    } catch (error) {
      console.error("Failed to save image to the chapter folder.", error);
    }
  };

  const mediaEditing: GuideStepMediaEditing = {
    activeIndex,
    onSelectImage: setActiveMediaIndex,
    onAddImage: () => fileInputRef.current?.click(),
    onEditAnnotations: (index) => setAnnotatingIndex(index),
    onEditCrop: (index) => setCroppingIndex(index),
    onRemoveImage: (index) =>
      onStepChange((draft) => {
        draft.media.splice(index, 1);
      }),
    onReorderImage: (from, to) => {
      onStepChange((draft) => {
        const [moved] = draft.media.splice(from, 1);
        draft.media.splice(to, 0, moved);
      });
      setActiveMediaIndex((current) => indexAfterMove(current, from, to));
    },
  };

  const updateBullet = (
    bulletId: string,
    mutate: (bullet: StepDraft["bullets"][number]) => void,
  ) =>
    onStepChange((draft) => {
      const bullet = draft.bullets.find((item) => item.id === bulletId);
      if (bullet) {
        mutate(bullet);
      }
    });

  const openMenu = (bulletId: string) =>
    setMenu({ bulletId, x: pointerRef.current.x, y: pointerRef.current.y });

  const withLinks = (bullet: StepDraft["bullets"][number]) =>
    (bullet.links ??= []);

  const addLink = (bulletId: string) =>
    updateBullet(bulletId, (bullet) =>
      void withLinks(bullet).push(createBlankLinkItem()),
    );

  const removeLink = (bulletId: string, index: number) =>
    updateBullet(bulletId, (bullet) => void bullet.links?.splice(index, 1));

  const reorderLink = (bulletId: string, from: number, to: number) =>
    updateBullet(bulletId, (bullet) => {
      const links = bullet.links;
      if (!links) return;
      const [moved] = links.splice(from, 1);
      links.splice(to, 0, moved);
    });

  const updateLinkAt = (
    bulletId: string,
    index: number,
    mutate: (link: LinkItemDraft) => void,
  ) =>
    updateBullet(bulletId, (bullet) => {
      const link = bullet.links?.[index];
      if (link) {
        mutate(link);
      }
    });

  const openLinkMenu = (bulletId: string, index: number) =>
    setLinkMenu({
      bulletId,
      index,
      x: pointerRef.current.x,
      y: pointerRef.current.y,
    });

  const pickDownloadFile = () => {
    if (linkMenu) {
      downloadPendingRef.current = {
        bulletId: linkMenu.bulletId,
        index: linkMenu.index,
      };
      downloadInputRef.current?.click();
    }
  };

  const handleDownloadFile = async (file: File | undefined) => {
    const pending = downloadPendingRef.current;
    downloadPendingRef.current = null;
    if (!pending || !file) {
      return;
    }

    try {
      const src = await writeDownloadFile(directory, file);
      updateLinkAt(pending.bulletId, pending.index, (link) => {
        link.href = src;
        link.download = true;
      });
    } catch (error) {
      console.error("Failed to save the download file to the guide folder.", error);
    }
  };

  const annotatingMedia =
    annotatingIndex !== null ? step.media[annotatingIndex] : undefined;

  const croppingMedia =
    croppingIndex !== null ? step.media[croppingIndex] : undefined;

  const menuBullet = menu
    ? step.bullets.find((item) => item.id === menu.bulletId)
    : undefined;

  const linkMenuLink =
    linkMenu &&
    step.bullets.find((item) => item.id === linkMenu.bulletId)?.links?.[
      linkMenu.index
    ];

  return (
    <div
      onPointerDownCapture={(event) => {
        pointerRef.current = { x: event.clientX, y: event.clientY };
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void handleAddFiles(files);
        }}
      />
      <input
        ref={downloadInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void handleDownloadFile(file);
        }}
      />

      <GuideStep
        number={stepNumber}
        completable={false}
        mediaEditing={mediaEditing}
        title={
          <InlineEditable
            value={step.title}
            placeholder="Step title"
            ariaLabel="Step title"
            onChange={(title) => onStepChange((draft) => void (draft.title = title))}
          />
        }
      >
        <GuideStep.Media>
          {step.media.map((item, index) => (
            <MediaFigure
              key={item.id}
              src={resolvedSrcs[index]}
              annotations={item.annotations}
              displayRegion={item.displayRegion}
            />
          ))}
        </GuideStep.Media>
        <GuideStep.Bullets
          editing={{
            onAddBullet: () =>
              onStepChange((draft) => void draft.bullets.push(createBlankBullet())),
            onRemoveBullet: (index) =>
              onStepChange((draft) => void draft.bullets.splice(index, 1)),
            onReorderBullet: (from, to) =>
              onStepChange((draft) => {
                const [moved] = draft.bullets.splice(from, 1);
                draft.bullets.splice(to, 0, moved);
              }),
          }}
        >
          {step.bullets.map((bullet) => (
            <GuideStep.Bullet
              key={bullet.id}
              variant={bullet.variant}
              color={bullet.color}
              markerAriaLabel="Change bullet style"
              onMarkerPress={() => openMenu(bullet.id)}
            >
              {bullet.variant === "button" ? (
                <LinkButton
                  editing={{
                    onAddItem: () => addLink(bullet.id),
                    onRemoveItem: (index) => removeLink(bullet.id, index),
                    onReorderItem: (from, to) =>
                      reorderLink(bullet.id, from, to),
                    onSelectItem: (index) => openLinkMenu(bullet.id, index),
                  }}
                >
                  {(bullet.links ?? []).map((link, index) => (
                    <LinkButton.Item
                      key={link.id}
                      href={link.href}
                      download={link.download}
                      external={link.external}
                    >
                      <InlineEditable
                        value={link.label}
                        placeholder="Button label"
                        ariaLabel="Button label"
                        onChange={(label) =>
                          updateLinkAt(
                            bullet.id,
                            index,
                            (item) => void (item.label = label),
                          )
                        }
                      />
                    </LinkButton.Item>
                  ))}
                </LinkButton>
              ) : (
                <InlineEditable
                  value={bullet.body}
                  placeholder="Describe this point"
                  ariaLabel="Bullet text"
                  onChange={(body) =>
                    updateBullet(bullet.id, (item) => void (item.body = body))
                  }
                />
              )}
            </GuideStep.Bullet>
          ))}
        </GuideStep.Bullets>
      </GuideStep>

      {menu && menuBullet && (
        <div className="fixed inset-0 z-50" onPointerDown={() => setMenu(null)}>
          <div
            className="absolute"
            style={anchorMenu(menu.x, menu.y, MENU_WIDTH, MENU_HEIGHT)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <BulletMarkerMenu
              variant={menuBullet.variant}
              color={menuBullet.color}
              onSelectColor={(color: GuideColor) => {
                updateBullet(menu.bulletId, (bullet) => {
                  bullet.variant = "dot";
                  bullet.color = color;
                });
                setMenu(null);
              }}
              onSelectVariant={(variant: GuideBulletVariant) => {
                updateBullet(menu.bulletId, (bullet) => {
                  bullet.variant = variant;
                  if (variant === "button" && !bullet.links?.length) {
                    bullet.links = [createBlankLinkItem()];
                  }
                });
                setMenu(null);
              }}
            />
          </div>
        </div>
      )}

      {linkMenu && linkMenuLink && (
        <div className="fixed inset-0 z-[60]" onPointerDown={() => setLinkMenu(null)}>
          <div
            className="absolute"
            style={anchorMenu(linkMenu.x, linkMenu.y, LINK_MENU_WIDTH, LINK_MENU_HEIGHT)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <LinkItemMenu
              link={linkMenuLink}
              onChange={(mutate) =>
                updateLinkAt(linkMenu.bulletId, linkMenu.index, mutate)
              }
              onUploadFile={pickDownloadFile}
            />
          </div>
        </div>
      )}

      <AnnotationEditorModal
        isOpen={annotatingIndex !== null}
        src={annotatingIndex !== null ? (resolvedSrcs[annotatingIndex] ?? "") : ""}
        annotations={annotatingMedia?.annotations ?? []}
        onClose={() => setAnnotatingIndex(null)}
        onChange={(recipe) =>
          onStepChange((draft) => {
            if (annotatingIndex === null) return;
            const target = draft.media[annotatingIndex];
            if (target) {
              recipe((target.annotations ??= []));
            }
          })
        }
      />

      <CropEditorModal
        isOpen={croppingIndex !== null}
        src={croppingIndex !== null ? (resolvedSrcs[croppingIndex] ?? "") : ""}
        region={croppingMedia?.displayRegion}
        onClose={() => setCroppingIndex(null)}
        onChange={(region: MediaDisplayRegion | undefined) =>
          onStepChange((draft) => {
            if (croppingIndex === null) return;
            const target = draft.media[croppingIndex];
            if (!target) return;
            if (region) {
              target.displayRegion = region;
            } else {
              delete target.displayRegion;
            }
          })
        }
      />
    </div>
  );
}
