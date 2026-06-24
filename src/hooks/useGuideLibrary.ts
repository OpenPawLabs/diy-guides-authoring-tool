import { useCallback, useEffect, useState } from "react";
import {
  findGuideByHandle,
  listGuides,
  putGuide,
  removeGuide,
  type StoredGuide,
} from "../lib/fs/guideStore";
import { pickGuideFolder } from "../lib/fs/pickFolder";
import { UserCancelledFolderPickError } from "../lib/fs/types";

interface GuideLibrary {
  /** Recents, newest first. `null` while the first load is in flight. */
  guides: StoredGuide[] | null;
  error?: string;
  /** Pick a folder and return the id of the (new or existing) guide to open. */
  openFolder: () => Promise<string | null>;
  forget: (id: string) => Promise<void>;
}

export function useGuideLibrary(): GuideLibrary {
  const [guides, setGuides] = useState<StoredGuide[] | null>(null);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setGuides(await listGuides());
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const list = await listGuides();
      if (active) {
        setGuides(list);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const openFolder = useCallback(async () => {
    setError(undefined);
    try {
      const handle = await pickGuideFolder();
      const existing = await findGuideByHandle(handle);
      const guide: StoredGuide = existing
        ? { ...existing, folderName: handle.name, lastOpenedAt: Date.now() }
        : {
            id: crypto.randomUUID(),
            handle,
            folderName: handle.name,
            lastOpenedAt: Date.now(),
          };

      await putGuide(guide);
      await refresh();
      return guide.id;
    } catch (caught) {
      if (caught instanceof UserCancelledFolderPickError) {
        return null;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Could not open the selected folder.",
      );
      return null;
    }
  }, [refresh]);

  const forget = useCallback(
    async (id: string) => {
      await removeGuide(id);
      await refresh();
    },
    [refresh],
  );

  return { guides, error, openFolder, forget };
}
