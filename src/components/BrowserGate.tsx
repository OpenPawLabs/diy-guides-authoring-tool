import type { ReactNode } from "react";
import { Alert, Button, Card } from "@heroui/react";
import { supportsDirectoryPicker } from "../lib/fs/pickFolder";

interface BrowserGateProps {
  children: ReactNode;
}

export function BrowserGate({ children }: BrowserGateProps) {
  if (supportsDirectoryPicker()) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <Card.Header>
          <Card.Title>Open this tool in Chrome</Card.Title>
          <Card.Description>
            The authoring tool needs Chrome&apos;s File System Access API so it
            can read and write a local guide chapter folder.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-6">
          <Alert className="border border-warning-300 bg-warning-50">
            <Alert.Content>
              <Alert.Title>Unsupported browser</Alert.Title>
              <Alert.Description>
                Firefox, Safari, and other browsers are planned for later. For
                Phase 1, use a current Chrome or Chromium browser on localhost
                or the GitHub Pages site.
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <Button
            variant="primary"
            onPress={() =>
              window.open("https://www.google.com/chrome/", "_blank", "noreferrer")
            }
          >
            Get Chrome
          </Button>
        </Card.Content>
      </Card>
    </main>
  );
}
