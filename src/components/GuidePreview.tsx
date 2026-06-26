import { Alert, Card, Spinner } from "@heroui/react";
import {
  Callout,
  GuideLayout,
  GuideStep,
  GuideStepList,
  LinkButton,
  MediaFigure,
  MediaFigureThumbnail,
  mediaFigureType,
  ToolList,
  type GuideLayoutHeaderProps,
  type GuideLayoutProps,
  type LinkButtonItemProps,
  type LinkButtonProps,
  type MediaFigureProps,
  type ToolListItemProps,
  type ToolListProps,
} from "@openpawlabs/diy-guides-ui";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import { useResolvedImageSrc, assetBaseName } from "../hooks/useResolvedImageSrc";
import {
  compileGuideMdx,
  formatMdxError,
  type GuideMdxComponent,
} from "../lib/mdx/guideMdx";

const PREVIEW_DEBOUNCE_MS = 250;

/** Original list item before any preview-scoped compound overrides. */
const ToolListItemBase = ToolList.Item;

/** Original header before any preview-scoped compound overrides. */
const GuideLayoutHeaderBase = GuideLayout.Header;

interface GuidePreviewProps {
  source: string;
  directory: FileSystemDirectoryHandle;
  /** Reader-style output — no editor chrome, frame, or update badge. */
  bare?: boolean;
}

export function GuidePreview({ source, directory, bare = false }: GuidePreviewProps) {
  const [content, setContent] = useState<GuideMdxComponent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(true);
  const components = useMemo(() => createPreviewComponents(directory), [directory]);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setIsUpdating(true);
      setError(null);

      try {
        const compiled = await compileGuideMdx(source);
        if (!cancelled) {
          setContent(() => compiled.Content);
          setIsUpdating(false);
        }
      } catch (compileError) {
        if (!cancelled) {
          setError(formatMdxError(compileError));
          setIsUpdating(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [source]);

  if (error && !content) {
    return (
      <Alert className="border border-danger-300 bg-danger-50">
        <Alert.Content>
          <Alert.Title>MDX preview error</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (!content && isUpdating) {
    if (bare) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-default-600">
          <Spinner size="sm" />
        </div>
      );
    }

    return (
      <Card className="min-h-80">
        <Card.Content className="flex min-h-80 items-center justify-center gap-3 text-default-600">
          <Spinner size="sm" />
          <span>Updating preview</span>
        </Card.Content>
      </Card>
    );
  }

  if (!content) {
    return null;
  }

  const Content = content;

  const guideContent = <Content components={components} />;

  if (bare) {
    return (
      <>
        {error && (
          <Alert className="mb-3 border border-danger-300 bg-danger-50">
            <Alert.Content>
              <Alert.Title>MDX preview error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        {guideContent}
      </>
    );
  }

  return (
    <div className="relative">
      {error && (
        <Alert className="mb-3 border border-danger-300 bg-danger-50">
          <Alert.Content>
            <Alert.Title>MDX preview error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
        {guideContent}
      </div>
      {isUpdating && (
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-end p-3"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-sm text-default-600 shadow-sm">
            <Spinner size="sm" />
            Updating preview
          </span>
        </div>
      )}
    </div>
  );
}

type PreviewMediaFigureProps = MediaFigureProps & { thumbnailPreview?: boolean };

function createPreviewComponents(directory: FileSystemDirectoryHandle) {
  function PreviewMediaFigure(props: PreviewMediaFigureProps) {
    const resolvedSrc = useResolvedImageSrc(directory, props.src);
    const modelFileName =
      props.type === "model" ? assetBaseName(props.src) : undefined;

    if (props.thumbnailPreview) {
      return (
        <MediaFigureThumbnail
          src={resolvedSrc}
          type={props.type}
          annotations={props.annotations}
          displayRegion={props.displayRegion}
          className={props.className}
        />
      );
    }

    return (
      <MediaFigure {...props} src={resolvedSrc} modelFileName={modelFileName} />
    );
  }

  PreviewMediaFigure[mediaFigureType] = true;

  function PreviewToolListItem(props: ToolListItemProps) {
    const resolvedThumbnail = useResolvedImageSrc(directory, props.thumbnail ?? "");
    return (
      <ToolListItemBase
        {...props}
        thumbnail={props.thumbnail ? resolvedThumbnail : undefined}
      />
    );
  }

  function PreviewToolListRoot(props: ToolListProps) {
    return <ToolList {...props} />;
  }

  const PreviewToolList = Object.assign(PreviewToolListRoot, {
    Item: PreviewToolListItem,
  });

  function PreviewLinkButtonRoot(props: LinkButtonProps) {
    const children = Children.map(props.children, (child) => {
      if (!isValidElement<LinkButtonItemProps>(child)) {
        return child;
      }

      if (child.type !== LinkButton.Item && child.type !== PreviewLinkButtonItem) {
        return child;
      }

      const href = child.props.href?.trim() || "#";
      // LinkButton filters children by `node.type === LinkButtonItem`; MDX passes
      // PreviewLinkButtonItem, so normalize to the library component.
      return (
        <LinkButton.Item
          key={child.key}
          download={child.props.download}
          external={child.props.external}
          href={href}
        >
          {child.props.children}
        </LinkButton.Item>
      );
    });

    return <LinkButton {...props}>{children}</LinkButton>;
  }

  function PreviewLinkButtonItem(props: LinkButtonItemProps) {
    return <LinkButton.Item {...props} />;
  }

  const PreviewLinkButton = Object.assign(PreviewLinkButtonRoot, {
    Item: PreviewLinkButtonItem,
  });

  function PreviewGuideLayoutHeader(props: GuideLayoutHeaderProps) {
    const resolvedHero = useResolvedImageSrc(directory, props.heroImage ?? "");
    return (
      <GuideLayoutHeaderBase
        {...props}
        heroImage={props.heroImage ? resolvedHero : undefined}
      />
    );
  }

  function PreviewGuideLayoutRoot(props: GuideLayoutProps) {
    return <GuideLayout {...props} />;
  }

  const PreviewGuideLayout = Object.assign(PreviewGuideLayoutRoot, {
    Header: PreviewGuideLayoutHeader,
    Intro: GuideLayout.Intro,
    Sidebar: GuideLayout.Sidebar,
    Content: GuideLayout.Content,
  });

  return {
    Callout,
    GuideLayout: PreviewGuideLayout,
    GuideStep,
    GuideStepList,
    LinkButton: PreviewLinkButton,
    MediaFigure: PreviewMediaFigure,
    ToolList: PreviewToolList,
  };
}
