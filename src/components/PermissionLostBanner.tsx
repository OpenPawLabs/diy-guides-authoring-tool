import { Alert, Button } from "@heroui/react";

interface PermissionLostBannerProps {
  folderName?: string;
  onReopenFolder: () => void;
}

export function PermissionLostBanner({
  folderName,
  onReopenFolder,
}: PermissionLostBannerProps) {
  return (
    <Alert className="border border-warning-300 bg-warning-50">
      <Alert.Content>
        <Alert.Title>Folder permission needs to be renewed</Alert.Title>
        <Alert.Description>
          {folderName
            ? `Chrome no longer has access to "${folderName}". Re-open the folder to continue.`
            : "Chrome no longer has access to the selected folder. Re-open it to continue."}
        </Alert.Description>
        <div className="mt-4">
          <Button variant="secondary" onPress={onReopenFolder}>
            Re-open folder
          </Button>
        </div>
      </Alert.Content>
    </Alert>
  );
}
