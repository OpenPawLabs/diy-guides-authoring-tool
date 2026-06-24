import {
  GuideStep,
  LinkButton,
  MediaFigure,
  type GuideStepMediaEditing,
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
import { BulletMarkerMenu } from "./BulletMarkerMenu";
import { InlineEditable } from "./InlineEditable";
import { LinkItemMenu } from "./LinkItemMenu";

interface GuideStepEditorProps {
  step: StepDraft;
  stepNumber: number;
  directory: FileSystemDirectoryHandle;
  onStepChange: (mutate: (step: StepDraft) => void) => void;
}

type PendingUpload = "add" | { replace: number };
type PendingDownload = { bulletId: string; index: number };

const MENU_WIDTH = 224;
const LINK_MENU_WIDTH = 288;

/** Track which index the active selection lands on after a thumbnail is moved. */
function indexAfterMove(current: number, from: number, to: number): number {
  if (current === from) return to;
  if (from < current && current <= to) return current - 1;
  if (to <= current && current < from) return current + 1;
  return current;
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
  const pendingRef = useRef<PendingUpload | null>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);
  const downloadPendingRef = useRef<PendingDownload | null>(null);

  const resolvedSrcs = useResolvedImageSrcs(
    directory,
    step.media.map((item) => item.src),
  );

  const activeIndex = step.media.length
    ? Math.min(activeMediaIndex, step.media.length - 1)
    : 0;

  const pickImages = (action: PendingUpload) => {
    pendingRef.current = action;
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: File[]) => {
    const action = pendingRef.current;
    pendingRef.current = null;
    if (!action || files.length === 0) {
      return;
    }

    try {
      if (action === "add") {
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
      } else {
        const src = await writeImageFile(directory, files[0]);
        onStepChange((draft) => {
          const target = draft.media[action.replace];
          if (target) {
            target.src = src;
          }
        });
      }
    } catch (error) {
      console.error("Failed to save image to the chapter folder.", error);
    }
  };

  const mediaEditing: GuideStepMediaEditing = {
    activeIndex,
    onSelectImage: setActiveMediaIndex,
    onAddImage: () => pickImages("add"),
    onReplaceImage: (index) => pickImages({ replace: index }),
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
          void handleFiles(files);
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
            <MediaFigure key={item.id} src={resolvedSrcs[index]} />
          ))}
        </GuideStep.Media>
        <GuideStep.Bullets>
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
          <li className="list-none">
            <button
              type="button"
              onClick={() =>
                onStepChange((draft) => void draft.bullets.push(createBlankBullet()))
              }
              className="rounded-md px-1 py-0.5 text-sm font-medium text-default-500 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              + New bullet
            </button>
          </li>
        </GuideStep.Bullets>
      </GuideStep>

      {menu && menuBullet && (
        <div className="fixed inset-0 z-50" onPointerDown={() => setMenu(null)}>
          <div
            className="absolute"
            style={{
              top: menu.y + 10,
              left: Math.min(menu.x, window.innerWidth - MENU_WIDTH - 8),
            }}
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
            style={{
              top: linkMenu.y + 10,
              left: Math.min(linkMenu.x, window.innerWidth - LINK_MENU_WIDTH - 8),
            }}
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
    </div>
  );
}
