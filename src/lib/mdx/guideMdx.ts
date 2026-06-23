import { evaluate } from "@mdx-js/mdx";
import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

const GUIDE_UI_PACKAGE = "@openpawlabs/diy-guides-ui";

export type GuideMdxComponent = ComponentType<{
  components?: Record<string, unknown>;
}>;

export interface CompiledGuideMdx {
  Content: GuideMdxComponent;
}

export async function compileGuideMdx(source: string): Promise<CompiledGuideMdx> {
  const module = await evaluate(stripGuideUiImports(source), {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return { Content: module.default as GuideMdxComponent };
}

export function formatMdxError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      reason?: string;
      message?: string;
      line?: number;
      column?: number;
    };
    const message = candidate.reason ?? candidate.message;

    if (message) {
      if (candidate.line && candidate.column) {
        return `${message} (${candidate.line}:${candidate.column})`;
      }

      return message;
    }
  }

  return "The MDX preview could not be compiled.";
}

export function stripGuideUiImports(source: string): string {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);
  const kept: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isImportStart(line)) {
      kept.push(line);
      continue;
    }

    const statement = [line];
    while (!isCompleteImport(statement.join("\n")) && index < lines.length - 1) {
      index += 1;
      statement.push(lines[index]);
    }

    if (!importsGuideUi(statement.join("\n"))) {
      kept.push(...statement);
    }
  }

  return kept.join(newline).trimStart();
}

function isImportStart(line: string): boolean {
  return /^import(?:\s|[{*])/.test(line.trimStart());
}

function isCompleteImport(statement: string): boolean {
  return (
    /^\s*import\s+["'][^"']+["']\s*;?\s*$/.test(statement) ||
    /\sfrom\s+["'][^"']+["']\s*;?\s*$/.test(statement)
  );
}

function importsGuideUi(statement: string): boolean {
  return new RegExp(`\\sfrom\\s+["']${escapeRegExp(GUIDE_UI_PACKAGE)}["']`).test(
    statement,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
