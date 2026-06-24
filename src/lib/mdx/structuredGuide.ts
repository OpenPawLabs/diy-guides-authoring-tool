import { unified } from "unified";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";

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
export const bulletVariants = ["dot", "caution", "reminder", "note"] as const;

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

export interface StepMediaDraft {
  id: string;
  src: string;
}

export interface BulletDraft {
  id: string;
  variant: GuideBulletVariant;
  color: GuideColor;
  body: string;
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

export function createStepMedia(src = ""): StepMediaDraft {
  return { id: createDraftId("step-media"), src };
}

export function createBlankBullet(): BulletDraft {
  return {
    id: createDraftId("bullet"),
    variant: "dot",
    color: "GREY",
    body: "Add an instruction.",
  };
}

function parseHeader(node: MdxNode): GuideHeaderDraft {
  return {
    title: stringAttribute(node, "title") ?? "",
    difficulty: enumAttribute(node, "difficulty", guideDifficulties, "easy"),
    timeEstimate: stringAttribute(node, "timeEstimate") ?? "",
    meta: stringAttribute(node, "meta") ?? "",
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
        (name) => name !== "src",
      );
      if (unsupportedFigureAttrs.length > 0) {
        throw new Error(
          `MediaFigure has unsupported attributes: ${unsupportedFigureAttrs.join(", ")}. Use Raw MDX for annotations and display regions.`,
        );
      }

      return {
        id: `step-${index + 1}-media-${figureIndex + 1}`,
        src: stringAttribute(figure, "src") ?? "",
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

  return {
    id: `bullet-${stepIndex + 1}-${bulletIndex + 1}`,
    variant: enumAttribute(bullet, "variant", bulletVariants, "dot"),
    color: enumAttribute(bullet, "color", guideColors, "GREY"),
    body: innerMdx(source, bullet),
  };
}

function serializeHeader(header: GuideHeaderDraft): string {
  return [
    "  <GuideLayout.Header",
    `    title="${escapeAttribute(header.title)}"`,
    `    difficulty="${header.difficulty}"`,
    `    timeEstimate="${escapeAttribute(header.timeEstimate)}"`,
    `    meta="${escapeAttribute(header.meta)}"`,
    "  />",
  ].join("\n");
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
    media
      .map((item) => `          <MediaFigure src="${escapeAttribute(item.src)}" />`)
      .join("\n"),
    "        </GuideStep.Media>",
  ].join("\n");
}

function serializeBullet(bullet: BulletDraft): string {
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

function createDraftId(prefix: string): string {
  if ("crypto" in globalThis && "randomUUID" in globalThis.crypto) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
