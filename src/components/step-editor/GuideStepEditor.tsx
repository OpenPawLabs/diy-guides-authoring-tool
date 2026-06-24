import {
  GuideStep,
  MediaFigure,
  type GuideStepMediaEditing,
} from "@openpawlabs/diy-guides-ui";
import { useRef, useState } from "react";
import { useResolvedImageSrcs } from "../../hooks/useResolvedImageSrc";
import { writeImageFile } from "../../lib/fs/chapterFiles";
import {
  createBlankBullet,
  createStepMedia,
  MAX_STEP_MEDIA,
  type GuideBulletVariant,
  type GuideColor,
  type StepDraft,
} from "../../lib/mdx/structuredGuide";
import { BulletMarkerMenu } from "./BulletMarkerMenu";
import { InlineEditable } from "./InlineEditable";

interface GuideStepEditorProps {
  step: StepDraft;
  stepNumber: number;
  directory: FileSystemDirectoryHandle;
  onStepChange: (mutate: (step: StepDraft) => void) => void;
}

type PendingUpload = "add" | { replace: number };

const MENU_WIDTH = 224;

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

  const pointerRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingUpload | null>(null);

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

  const menuBullet = menu
    ? step.bullets.find((item) => item.id === menu.bulletId)
    : undefined;

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
              <InlineEditable
                value={bullet.body}
                placeholder="Describe this point"
                ariaLabel="Bullet text"
                onChange={(body) =>
                  updateBullet(bullet.id, (item) => void (item.body = body))
                }
              />
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
                updateBullet(menu.bulletId, (bullet) => void (bullet.variant = variant));
                setMenu(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
