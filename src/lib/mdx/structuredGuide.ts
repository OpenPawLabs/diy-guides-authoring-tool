import { unified } from "unified";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import type { MediaAnnotation, MediaDisplayRegion } from "@openpawlabs/diy-guides-ui";

export const guideDifficulties = ["easy", "moderate", "difficult"] as const;
export const calloutTypes = ["note", "info", "tip", "caution", "danger"] as const;
export const guideColors = [
  "GREY",
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "LIGHT_BLUE",
  "BLUE",
  "MAGENTA",
] as const;
export const bulletVariants = [
  "dot",
  "caution",
  "reminder",
  "note",
  "button",
] as const;

export type GuideDifficulty = (typeof guideDifficulties)[number];
export type GuideCalloutType = (typeof calloutTypes)[number];
export type GuideColor = (typeof guideColors)[number];
export type GuideBulletVariant = (typeof bulletVariants)[number];

/** Maximum images per step, matching the UI library's gallery limit. */
export const MAX_STEP_MEDIA = 3;

export interface GuideDraft {
  header: GuideHeaderDraft;
  intro: string;
  toolLists: ToolListDraft[];
  callouts: CalloutDraft[];
  steps: StepDraft[];
}

export interface GuideHeaderDraft {
  title: string;
  difficulty: GuideDifficulty;
  timeEstimate: string;
  meta: string;
  heroImage?: string;
  heroImageAlt?: string;
}

export interface ToolListDraft {
  id: string;
  title: string;
  items: ToolItemDraft[];
}

export interface ToolItemDraft {
  id: string;
  name: string;
  quantity?: number;
  href?: string;
  price?: string;
  thumbnail?: string;
  details?: string;
}

export interface CalloutDraft {
  id: string;
  type: GuideCalloutType;
  title: string;
  body: string;
}

export interface StepDraft {
  id: string;
  title: string;
  media: StepMediaDraft[];
  bullets: BulletDraft[];
}

export type StepMediaType = "image" | "video" | "model";

export interface StepMediaDraft {
  id: string;
  src: string;
  /** Defaults to `"image"` when omitted. */
  type?: StepMediaType;
  /** Overlay markers, positioned by percentage of the visible 4:3 frame. */
  annotations?: MediaAnnotation[];
  /** 4:3 crop in source pixels; omit to center-crop a non-4:3 source. */
  displayRegion?: MediaDisplayRegion;
}

/** Annotation types the structured editor can round-trip through MDX. */
export const annotationTypes = ["point", "circle", "rectangle"] as const;
export type AnnotationType = (typeof annotationTypes)[number];

export interface BulletDraft {
  id: string;
  variant: GuideBulletVariant;
  color: GuideColor;
  body: string;
  /** Links for a `button` bullet — rendered through `LinkButton`. */
  links?: LinkItemDraft[];
}

export interface LinkItemDraft {
  id: string;
  /** Visible label. */
  label: string;
  /** URL to navigate to, or a (relative) file path to download. */
  href: string;
  /** Download instead of navigate; a string renames the downloaded file. */
  download?: boolean | string;
  /** Open in a new tab. */
  external?: boolean;
}

export type StructuredGuideParseResult =
  | {
      status: "supported";
      draft: GuideDraft;
      ownedRange: SourceRange;
      warnings: string[];
    }
  | {
      status: "unsupported";
      reason: string;
    };

interface SourceRange {
  start: number;
  end: number;
}

interface MdxNode {
  type: string;
  name?: string | null;
  value?: unknown;
  attributes?: MdxAttribute[];
  children?: MdxNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

interface MdxAttribute {
  type: string;
  name?: string;
  value?: string | MdxExpression | null;
}

interface MdxExpression {
  type?: string;
  value?: string;
  data?: { estree?: EstreeProgram };
}

interface EstreeProgram {
  body?: EstreeNode[];
}

/** Minimal ESTree shape — only the literal node kinds annotations may contain. */
interface EstreeNode {
  type: string;
  value?: unknown;
  name?: string;
  operator?: string;
  computed?: boolean;
  elements?: (EstreeNode | null)[];
  properties?: EstreeNode[];
  key?: EstreeNode;
  argument?: EstreeNode;
  expression?: EstreeNode;
}

export function parseStructuredGuide(source: string): StructuredGuideParseResult {
  let tree: MdxNode;

  try {
    tree = unified().use(remarkParse).use(remarkMdx).parse(source) as MdxNode;
  } catch (error) {
    return {
      status: "unsupported",
      reason:
        error instanceof Error
          ? error.message
          : "The MDX source could not be parsed.",
    };
  }

  const layout = findFirstElement(tree, "GuideLayout");
  if (!layout) {
    return {
      status: "unsupported",
      reason: "This document does not contain a standard <GuideLayout> block.",
    };
  }

  const ownedRange = nodeRange(layout);
  if (!ownedRange) {
    return {
      status: "unsupported",
      reason: "The guide layout could not be located in the source file.",
    };
  }

  const header = findChildElement(layout, "GuideLayout.Header");
  const intro = findChildElement(layout, "GuideLayout.Intro");
  const sidebar = findChildElement(layout, "GuideLayout.Sidebar");
  const content = findChildElement(layout, "GuideLayout.Content");

  if (!header || !intro || !content) {
    return {
      status: "unsupported",
      reason:
        "The structured editor needs GuideLayout.Header, GuideLayout.Intro, and GuideLayout.Content.",
    };
  }

  const stepList = findChildElement(content, "GuideStepList");
  if (!stepList) {
    return {
      status: "unsupported",
      reason: "The structured editor needs a standard <GuideStepList>.",
    };
  }

  try {
    const warnings: string[] = [];
    const draft: GuideDraft = {
      header: parseHeader(header),
      intro: innerMdx(source, intro),
      toolLists: sidebar ? parseToolLists(source, sidebar, warnings) : [],
      callouts: parseCallouts(source, content),
      steps: parseSteps(source, stepList, warnings),
    };

    if (draft.steps.length === 0) {
      return {
        status: "unsupported",
        reason: "A structured guide needs at least one guide step.",
      };
    }

    return { status: "supported", draft, ownedRange, warnings };
  } catch (error) {
    return {
      status: "unsupported",
      reason:
        error instanceof Error
          ? error.message
          : "This guide uses MDX the structured editor does not support yet.",
    };
  }
}

export function updateStructuredGuideSource(
  source: string,
  draft: GuideDraft,
): string {
  const parsed = parseStructuredGuide(source);
  if (parsed.status !== "supported") {
    throw new Error(parsed.reason);
  }

  return [
    source.slice(0, parsed.ownedRange.start),
    serializeGuideLayout(draft),
    source.slice(parsed.ownedRange.end),
  ].join("");
}

export function serializeGuideLayout(draft: GuideDraft): string {
  const sections = [
    "<GuideLayout>",
    serializeHeader(draft.header),
    serializeIntro(draft.intro),
  ];

  if (draft.toolLists.length > 0) {
    sections.push(serializeSidebar(draft.toolLists));
  }

  sections.push(serializeContent(draft.callouts, draft.steps));
  sections.push("</GuideLayout>");
  return sections.join("\n\n");
}

export function createBlankToolList(): ToolListDraft {
  return {
    id: createDraftId("tool-list"),
    title: "Tools",
    items: [createBlankToolItem()],
  };
}

export function createBlankToolItem(): ToolItemDraft {
  return {
    id: createDraftId("tool-item"),
    name: "Required tool",
    quantity: 1,
  };
}

export function createBlankCallout(): CalloutDraft {
  return {
    id: createDraftId("callout"),
    type: "note",
    title: "Note",
    body: "Add important context here.",
  };
}

export function createBlankStep(): StepDraft {
  return {
    id: createDraftId("step"),
    title: "Describe the next step",
    media: [],
    bullets: [createBlankBullet()],
  };
}

export function createStepMedia(
  src = "",
  type: StepMediaType = "image",
): StepMediaDraft {
  return {
    id: createDraftId("step-media"),
    src,
    ...(type !== "image" ? { type } : {}),
  };
}

export function createBlankBullet(): BulletDraft {
  return {
    id: createDraftId("bullet"),
    variant: "dot",
    color: "GREY",
    body: "Add an instruction.",
  };
}

export function createBlankLinkItem(): LinkItemDraft {
  return {
    id: createDraftId("link"),
    label: "Download",
    href: "",
    download: true,
  };
}

function parseHeader(node: MdxNode): GuideHeaderDraft {
  return {
    title: stringAttribute(node, "title") ?? "",
    difficulty: enumAttribute(node, "difficulty", guideDifficulties, "easy"),
    timeEstimate: stringAttribute(node, "timeEstimate") ?? "",
    meta: stringAttribute(node, "meta") ?? "",
    heroImage: stringAttribute(node, "heroImage") || undefined,
    heroImageAlt: stringAttribute(node, "heroImageAlt") || undefined,
  };
}

function parseToolLists(
  source: string,
  sidebar: MdxNode,
  warnings: string[],
): ToolListDraft[] {
  return childElements(sidebar, "ToolList").map((toolList, index) => ({
    id: `tool-list-${index + 1}`,
    title: stringAttribute(toolList, "title") ?? "What you need",
    items: parseToolItems(source, toolList, index, warnings),
  }));
}

function parseToolItems(
  source: string,
  toolList: MdxNode,
  listIndex: number,
  warnings: string[],
): ToolItemDraft[] {
  return childElements(toolList, "ToolList.Item").map((item, index) => {
    const unsupported = attributeNames(item).filter(
      (name) =>
        !["name", "quantity", "href", "price", "thumbnail"].includes(name),
    );
    if (unsupported.length > 0) {
      warnings.push(
        `Tool item "${stringAttribute(item, "name") ?? index + 1}" has unsupported attributes: ${unsupported.join(", ")}.`,
      );
    }

    return {
      id: `tool-item-${listIndex + 1}-${index + 1}`,
      name: stringAttribute(item, "name") ?? "",
      quantity: numberAttribute(item, "quantity"),
      href: stringAttribute(item, "href"),
      price: stringAttribute(item, "price"),
      thumbnail: stringAttribute(item, "thumbnail"),
      details: innerMdx(source, item),
    };
  });
}

function parseCallouts(source: string, content: MdxNode): CalloutDraft[] {
  return childElements(content, "Callout").map((callout, index) => ({
    id: `callout-${index + 1}`,
    type: enumAttribute(callout, "type", calloutTypes, "note"),
    title: stringAttribute(callout, "title") ?? "",
    body: innerMdx(source, callout),
  }));
}

function parseSteps(
  source: string,
  stepList: MdxNode,
  warnings: string[],
): StepDraft[] {
  return childElements(stepList, "GuideStep").map((step, index) => {
    const media = findChildElement(step, "GuideStep.Media");
    const bullets = findChildElement(step, "GuideStep.Bullets");
    if (!media || !bullets) {
      throw new Error("Each structured step needs GuideStep.Media and GuideStep.Bullets.");
    }

    const figures = childElements(media, "MediaFigure");
    if (figures.length > MAX_STEP_MEDIA) {
      throw new Error(
        `A step supports up to ${MAX_STEP_MEDIA} images. Use Raw MDX for more.`,
      );
    }

    const stepMedia = figures.map((figure, figureIndex) => {
      const unsupportedFigureAttrs = attributeNames(figure).filter(
        (name) => !["src", "type", "annotations", "displayRegion"].includes(name),
      );
      if (unsupportedFigureAttrs.length > 0) {
        throw new Error(
          `MediaFigure has unsupported attributes: ${unsupportedFigureAttrs.join(", ")}. Use Raw MDX.`,
        );
      }

      const prefix = `step-${index + 1}-media-${figureIndex + 1}`;
      const type = parseMediaType(figure);
      const annotations = parseAnnotations(figure, prefix);
      const displayRegion = parseDisplayRegion(figure);
      return {
        id: prefix,
        src: stringAttribute(figure, "src") ?? "",
        ...(type !== "image" ? { type } : {}),
        ...(annotations.length > 0 ? { annotations } : {}),
        ...(displayRegion ? { displayRegion } : {}),
      };
    });

    const parsedBullets = childElements(bullets, "GuideStep.Bullet").map(
      (bullet, bulletIndex) =>
        parseBullet(source, bullet, index, bulletIndex, warnings),
    );

    if (parsedBullets.length === 0) {
      throw new Error("Each structured step needs at least one bullet.");
    }

    return {
      id: `step-${index + 1}`,
      title: stringAttribute(step, "title") ?? "",
      media: stepMedia,
      bullets: parsedBullets,
    };
  });
}

function parseMediaType(figure: MdxNode): StepMediaType {
  const value = stringAttribute(figure, "type");
  if (!value || value === "image") {
    return "image";
  }
  if (value === "video" || value === "model") {
    return value;
  }
  throw new Error(
    `MediaFigure type must be "image", "video", or "model". Use Raw MDX.`,
  );
}

/** Read a `MediaFigure` `annotations={[…]}` attribute as literal annotation data. */
function parseAnnotations(figure: MdxNode, idPrefix: string): MediaAnnotation[] {
  const attr = figure.attributes?.find((candidate) => candidate.name === "annotations");
  if (!attr) {
    return [];
  }

  const estree = typeof attr.value === "object" ? attr.value?.data?.estree : undefined;
  const statement = estree?.body?.[0];
  if (!statement || statement.type !== "ExpressionStatement" || !statement.expression) {
    throw new Error("MediaFigure annotations must be a literal array. Use Raw MDX.");
  }

  const value = evaluateLiteral(statement.expression);
  if (!Array.isArray(value)) {
    throw new Error("MediaFigure annotations must be a literal array. Use Raw MDX.");
  }

  return value.map((item, index) =>
    normalizeAnnotation(item, `${idPrefix}-annotation-${index + 1}`),
  );
}

/** Read a `MediaFigure` `displayRegion={{ x, y, width }}` attribute as a literal region. */
function parseDisplayRegion(figure: MdxNode): MediaDisplayRegion | undefined {
  const attr = figure.attributes?.find(
    (candidate) => candidate.name === "displayRegion",
  );
  if (!attr) {
    return undefined;
  }

  const estree = typeof attr.value === "object" ? attr.value?.data?.estree : undefined;
  const statement = estree?.body?.[0];
  if (!statement || statement.type !== "ExpressionStatement" || !statement.expression) {
    throw new Error("MediaFigure displayRegion must be a literal object. Use Raw MDX.");
  }

  const value = evaluateLiteral(statement.expression);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("MediaFigure displayRegion must be a literal object. Use Raw MDX.");
  }

  const data = value as Record<string, unknown>;
  const num = (key: string): number => {
    const raw = data[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new Error(`MediaFigure displayRegion needs a numeric "${key}". Use Raw MDX.`);
    }
    return raw;
  };

  return { x: num("x"), y: num("y"), width: num("width") };
}

/** Statically evaluate an ESTree node, allowing only JSON-like literal syntax. */
function evaluateLiteral(node: EstreeNode): unknown {
  switch (node.type) {
    case "ArrayExpression":
      return (node.elements ?? []).map((element) => {
        if (!element) {
          throw new Error("Sparse arrays are not supported in annotations. Use Raw MDX.");
        }
        return evaluateLiteral(element);
      });
    case "ObjectExpression":
      return Object.fromEntries(
        (node.properties ?? []).map((property) => {
          const key = property.key;
          if (property.type !== "Property" || property.computed || !key) {
            throw new Error("Only plain object properties are supported in annotations. Use Raw MDX.");
          }
          const name =
            key.type === "Identifier"
              ? key.name
              : key.type === "Literal"
                ? String(key.value)
                : undefined;
          if (name == null) {
            throw new Error("Unsupported object key in annotations. Use Raw MDX.");
          }
          return [name, evaluateLiteral(property.value as EstreeNode)];
        }),
      );
    case "Literal":
      return node.value;
    case "UnaryExpression":
      if (node.operator === "-" && node.argument) {
        const argument = evaluateLiteral(node.argument);
        if (typeof argument === "number") {
          return -argument;
        }
      }
      throw new Error("Unsupported expression in annotations. Use Raw MDX.");
    default:
      throw new Error(`Unsupported expression (${node.type}) in annotations. Use Raw MDX.`);
  }
}

/** Validate a decoded literal against the known annotation shapes. */
function normalizeAnnotation(value: unknown, id: string): MediaAnnotation {
  if (typeof value !== "object" || value === null) {
    throw new Error("Each MediaFigure annotation must be an object. Use Raw MDX.");
  }

  const data = value as Record<string, unknown>;
  const type = data.type ?? "point";
  if (type !== "point" && type !== "circle" && type !== "rectangle") {
    throw new Error(`Unsupported annotation type "${String(type)}". Use Raw MDX.`);
  }
  if (data.color !== undefined && !guideColors.includes(data.color as GuideColor)) {
    throw new Error(`Unsupported annotation color "${String(data.color)}". Use Raw MDX.`);
  }

  const num = (key: string): number => {
    const raw = data[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new Error(`Annotation is missing a numeric "${key}". Use Raw MDX.`);
    }
    return raw;
  };
  const shared = {
    id,
    ...(typeof data.color === "string" ? { color: data.color as GuideColor } : {}),
    ...(typeof data.title === "string" ? { title: data.title } : {}),
  };

  if (type === "circle") {
    return { type, x: num("x"), y: num("y"), radius: num("radius"), ...shared };
  }
  if (type === "rectangle") {
    return { type, x1: num("x1"), y1: num("y1"), x2: num("x2"), y2: num("y2"), ...shared };
  }
  return {
    type,
    x: num("x"),
    y: num("y"),
    ...(typeof data.label === "string" || typeof data.label === "number"
      ? { label: data.label }
      : {}),
    ...shared,
  };
}

function parseBullet(
  source: string,
  bullet: MdxNode,
  stepIndex: number,
  bulletIndex: number,
  warnings: string[],
): BulletDraft {
  const unsupported = attributeNames(bullet).filter(
    (name) => !["variant", "color"].includes(name),
  );
  if (unsupported.length > 0) {
    warnings.push(
      `Bullet ${bulletIndex + 1} in step ${stepIndex + 1} has unsupported attributes: ${unsupported.join(", ")}.`,
    );
  }

  const variant = enumAttribute(bullet, "variant", bulletVariants, "dot");

  if (variant === "button") {
    return {
      id: `bullet-${stepIndex + 1}-${bulletIndex + 1}`,
      variant,
      color: "GREY",
      body: "",
      links: parseLinkItems(source, bullet, stepIndex, bulletIndex, warnings),
    };
  }

  return {
    id: `bullet-${stepIndex + 1}-${bulletIndex + 1}`,
    variant,
    color: enumAttribute(bullet, "color", guideColors, "GREY"),
    body: innerMdx(source, bullet),
  };
}

function parseLinkItems(
  source: string,
  bullet: MdxNode,
  stepIndex: number,
  bulletIndex: number,
  warnings: string[],
): LinkItemDraft[] {
  const linkButton = findChildElement(bullet, "LinkButton");
  if (!linkButton) {
    throw new Error(
      `Button bullet ${bulletIndex + 1} in step ${stepIndex + 1} needs a <LinkButton>. Use Raw MDX for other content.`,
    );
  }

  return childElements(linkButton, "LinkButton.Item").map((item, index) => {
    const unsupported = attributeNames(item).filter(
      (name) => !["href", "download", "external"].includes(name),
    );
    if (unsupported.length > 0) {
      warnings.push(
        `Link ${index + 1} in step ${stepIndex + 1} has unsupported attributes: ${unsupported.join(", ")}.`,
      );
    }

    return {
      id: `link-${stepIndex + 1}-${bulletIndex + 1}-${index + 1}`,
      label: innerMdx(source, item),
      href: stringAttribute(item, "href") ?? "",
      download: downloadAttribute(item),
      external: flagAttribute(item, "external") || undefined,
    };
  });
}

function serializeHeader(header: GuideHeaderDraft): string {
  const attrs = [
    `title="${escapeAttribute(header.title)}"`,
    header.heroImage
      ? `heroImage="${escapeAttribute(header.heroImage)}"`
      : undefined,
    header.heroImageAlt
      ? `heroImageAlt="${escapeAttribute(header.heroImageAlt)}"`
      : undefined,
    `difficulty="${header.difficulty}"`,
    `timeEstimate="${escapeAttribute(header.timeEstimate)}"`,
    `meta="${escapeAttribute(header.meta)}"`,
  ].filter(Boolean);

  return [`  <GuideLayout.Header`, ...attrs.map((attr) => `    ${attr}`), "  />"].join(
    "\n",
  );
}

function serializeIntro(intro: string): string {
  return [
    "  <GuideLayout.Intro>",
    indentMdx(intro, 4),
    "  </GuideLayout.Intro>",
  ].join("\n");
}

function serializeSidebar(toolLists: ToolListDraft[]): string {
  return [
    "  <GuideLayout.Sidebar>",
    toolLists.map(serializeToolList).join("\n"),
    "  </GuideLayout.Sidebar>",
  ].join("\n");
}

function serializeToolList(toolList: ToolListDraft): string {
  return [
    `    <ToolList title="${escapeAttribute(toolList.title)}">`,
    toolList.items.map(serializeToolItem).join("\n"),
    "    </ToolList>",
  ].join("\n");
}

function serializeToolItem(item: ToolItemDraft): string {
  const attrs = [
    `name="${escapeAttribute(item.name)}"`,
    item.quantity != null ? `quantity={${item.quantity}}` : undefined,
    item.href ? `href="${escapeAttribute(item.href)}"` : undefined,
    item.price ? `price="${escapeAttribute(item.price)}"` : undefined,
    item.thumbnail ? `thumbnail="${escapeAttribute(item.thumbnail)}"` : undefined,
  ].filter(Boolean);

  if (!item.details?.trim()) {
    return `      <ToolList.Item ${attrs.join(" ")} />`;
  }

  return [
    `      <ToolList.Item ${attrs.join(" ")}>`,
    indentMdx(item.details, 8),
    "      </ToolList.Item>",
  ].join("\n");
}

function serializeContent(callouts: CalloutDraft[], steps: StepDraft[]): string {
  const children = [
    ...callouts.map(serializeCallout),
    serializeStepList(steps.length > 0 ? steps : [createBlankStep()]),
  ];

  return [
    "  <GuideLayout.Content>",
    children.join("\n\n"),
    "  </GuideLayout.Content>",
  ].join("\n");
}

function serializeCallout(callout: CalloutDraft): string {
  const title = callout.title
    ? ` title="${escapeAttribute(callout.title)}"`
    : "";
  return [
    `    <Callout type="${callout.type}"${title}>`,
    indentMdx(callout.body, 6),
    "    </Callout>",
  ].join("\n");
}

function serializeStepList(steps: StepDraft[]): string {
  return [
    "    <GuideStepList>",
    steps.map(serializeStep).join("\n"),
    "    </GuideStepList>",
  ].join("\n");
}

function serializeStep(step: StepDraft): string {
  const bullets = step.bullets.length > 0 ? step.bullets : [createBlankBullet()];

  return [
    `      <GuideStep title="${escapeAttribute(step.title)}">`,
    serializeStepMedia(step.media),
    "        <GuideStep.Bullets>",
    bullets.map(serializeBullet).join("\n"),
    "        </GuideStep.Bullets>",
    "      </GuideStep>",
  ].join("\n");
}

function serializeStepMedia(media: StepMediaDraft[]): string {
  if (media.length === 0) {
    return "        <GuideStep.Media />";
  }

  return [
    "        <GuideStep.Media>",
    media.map(serializeFigure).join("\n"),
    "        </GuideStep.Media>",
  ].join("\n");
}

function serializeFigure(item: StepMediaDraft): string {
  const src = escapeAttribute(item.src);
  const mediaType = item.type ?? "image";
  const hasAnnotations = item.annotations != null && item.annotations.length > 0;
  const hasRegion = item.displayRegion != null;

  if (mediaType === "image" && !hasAnnotations && !hasRegion) {
    return `          <MediaFigure src="${src}" />`;
  }

  const lines = ["          <MediaFigure", `            src="${src}"`];
  if (mediaType !== "image") {
    lines.push(`            type="${mediaType}"`);
  }

  if (hasRegion) {
    const round = (value: number) => Math.round(value * 100) / 100;
    const { x, y, width } = item.displayRegion!;
    lines.push(
      `            displayRegion={{ x: ${round(x)}, y: ${round(y)}, width: ${round(width)} }}`,
    );
  }

  if (hasAnnotations) {
    lines.push(
      "            annotations={[",
      item.annotations!
        .map((annotation) => `              ${serializeAnnotation(annotation)},`)
        .join("\n"),
      "            ]}",
    );
  }

  lines.push("          />");
  return lines.join("\n");
}

function serializeAnnotation(annotation: MediaAnnotation): string {
  const round = (value: number) => Math.round(value * 100) / 100;
  const parts = [`type: ${JSON.stringify(annotation.type ?? "point")}`];

  if (annotation.type === "circle") {
    parts.push(
      `x: ${round(annotation.x)}`,
      `y: ${round(annotation.y)}`,
      `radius: ${round(annotation.radius)}`,
    );
  } else if (annotation.type === "rectangle") {
    parts.push(
      `x1: ${round(annotation.x1)}`,
      `y1: ${round(annotation.y1)}`,
      `x2: ${round(annotation.x2)}`,
      `y2: ${round(annotation.y2)}`,
    );
  } else {
    parts.push(`x: ${round(annotation.x)}`, `y: ${round(annotation.y)}`);
    if (annotation.label != null && annotation.label !== "") {
      parts.push(`label: ${JSON.stringify(annotation.label)}`);
    }
  }

  if (annotation.color) {
    parts.push(`color: ${JSON.stringify(annotation.color)}`);
  }
  if (annotation.title) {
    parts.push(`title: ${JSON.stringify(annotation.title)}`);
  }

  return `{ ${parts.join(", ")} }`;
}

function serializeBullet(bullet: BulletDraft): string {
  if (bullet.variant === "button") {
    return serializeButtonBullet(bullet);
  }

  const attrs = [
    bullet.variant !== "dot" ? `variant="${bullet.variant}"` : undefined,
    bullet.variant === "dot" && bullet.color !== "GREY"
      ? `color="${bullet.color}"`
      : undefined,
  ].filter(Boolean);
  const attrText = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";

  return [
    `          <GuideStep.Bullet${attrText}>`,
    indentMdx(bullet.body, 12),
    "          </GuideStep.Bullet>",
  ].join("\n");
}

function serializeButtonBullet(bullet: BulletDraft): string {
  const items =
    bullet.links && bullet.links.length > 0
      ? bullet.links
      : [createBlankLinkItem()];

  return [
    '          <GuideStep.Bullet variant="button">',
    "            <LinkButton>",
    items.map(serializeLinkItem).join("\n"),
    "            </LinkButton>",
    "          </GuideStep.Bullet>",
  ].join("\n");
}

function serializeLinkItem(item: LinkItemDraft): string {
  const attrs = [
    `href="${escapeAttribute(item.href)}"`,
    item.download === true
      ? "download"
      : typeof item.download === "string" && item.download
        ? `download="${escapeAttribute(item.download)}"`
        : undefined,
    item.external ? "external" : undefined,
  ].filter(Boolean);

  return `              <LinkButton.Item ${attrs.join(" ")}>${item.label.trim() || "Download"}</LinkButton.Item>`;
}

function findFirstElement(node: MdxNode, name: string): MdxNode | null {
  if (isJsxElement(node) && node.name === name) {
    return node;
  }

  for (const child of node.children ?? []) {
    const found = findFirstElement(child, name);
    if (found) {
      return found;
    }
  }

  return null;
}

function findChildElement(node: MdxNode, name: string): MdxNode | null {
  return childElements(node, name)[0] ?? null;
}

function childElements(node: MdxNode, name?: string): MdxNode[] {
  const children = (node.children ?? []).flatMap((child) => {
    if (isJsxElement(child)) {
      return [child];
    }

    if (child.type === "paragraph") {
      return (child.children ?? []).filter(isJsxElement);
    }

    return [];
  });

  return name ? children.filter((child) => child.name === name) : children;
}

function isJsxElement(node: MdxNode): boolean {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

function stringAttribute(node: MdxNode, name: string): string | undefined {
  const attr = node.attributes?.find((candidate) => candidate.name === name);
  return typeof attr?.value === "string" ? attr.value : undefined;
}

function numberAttribute(node: MdxNode, name: string): number | undefined {
  const attr = node.attributes?.find((candidate) => candidate.name === name);
  const raw = expressionValue(attr?.value);
  if (raw == null || raw.trim() === "") {
    return undefined;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function enumAttribute<T extends string>(
  node: MdxNode,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = stringAttribute(node, name);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function expressionValue(value: MdxAttribute["value"]): string | undefined {
  return typeof value === "object" && value !== null ? value.value : undefined;
}

/** Read a boolean JSX attribute: bare (`external`), `external="true"`, or `external={true}`. */
function flagAttribute(node: MdxNode, name: string): boolean {
  const attr = node.attributes?.find((candidate) => candidate.name === name);
  if (!attr) {
    return false;
  }
  if (attr.value == null) {
    return true;
  }
  const raw =
    typeof attr.value === "string" ? attr.value : expressionValue(attr.value);
  return raw?.trim() !== "false";
}

/** Read the `download` attribute, which may be a boolean flag or a filename string. */
function downloadAttribute(node: MdxNode): boolean | string | undefined {
  const attr = node.attributes?.find((candidate) => candidate.name === "download");
  if (!attr) {
    return undefined;
  }
  if (attr.value == null) {
    return true;
  }
  if (typeof attr.value === "string") {
    return attr.value;
  }
  const raw = expressionValue(attr.value)?.trim();
  if (raw === "false") {
    return false;
  }
  return raw === "true" || raw == null ? true : raw;
}

function attributeNames(node: MdxNode): string[] {
  return (node.attributes ?? [])
    .map((attribute) => attribute.name)
    .filter((name): name is string => Boolean(name));
}

function innerMdx(source: string, node: MdxNode): string {
  const range = nodeRange(node);
  if (!range || !node.name || childElements(node).length === 0 && !hasTextChildren(node)) {
    return "";
  }

  const openingEnd = source.indexOf(">", range.start);
  const closingStart = source.lastIndexOf(`</${node.name}>`, range.end);
  if (openingEnd === -1 || closingStart === -1 || closingStart <= openingEnd) {
    return "";
  }

  return cleanMdxBlock(source.slice(openingEnd + 1, closingStart));
}

function hasTextChildren(node: MdxNode): boolean {
  return (node.children ?? []).some((child) => child.type !== "paragraph" || hasTextChildren(child));
}

function nodeRange(node: MdxNode): SourceRange | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number" ? { start, end } : null;
}

function cleanMdxBlock(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  while (lines[0]?.trim() === "") {
    lines.shift();
  }

  while (lines.at(-1)?.trim() === "") {
    lines.pop();
  }

  const indentation = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^ */)?.[0].length ?? 0);
  const minIndent = indentation.length > 0 ? Math.min(...indentation) : 0;

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

function indentMdx(value: string, spaces: number): string {
  const indentation = " ".repeat(spaces);
  const lines = (value.trim() || " ").replace(/\r\n/g, "\n").split("\n");
  return lines.map((line) => `${indentation}${line}`).join("\n");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function createDraftId(prefix: string): string {
  if ("crypto" in globalThis && "randomUUID" in globalThis.crypto) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
