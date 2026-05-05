import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Folder, RefreshCw, File, FolderPlus, Pencil, Trash2, Copy } from "lucide-react";
import type { TreeNode } from "../../types";
import { readDropItems } from "../../utils/drop-handler";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { TreeNodeItem } from "./TreeNodeItem";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { ConfirmDialog } from "./ConfirmDialog";
import { InlineInput } from "./InlineInput";
import { PinButton } from "../sidebar/PinButton";

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode | null;
}

export function ExplorerSidebar({ hideOuterShell }: { hideOuterShell?: boolean }) {
  const { t } = useTranslation();
  const treeNodes = useExplorerStore((s) => s.treeNodes);
  const currentPath = useExplorerStore((s) => s.currentPath);
  const selectedPath = useExplorerStore((s) => s.selectedPath);
  const editingNode = useExplorerStore((s) => s.editingNode);
  const setCurrentPath = useExplorerStore((s) => s.setCurrentPath);
  const listRootDir = useExplorerStore((s) => s.listRootDir);
  const toggleNode = useExplorerStore((s) => s.toggleNode);
  const openFile = useExplorerStore((s) => s.openFile);
  const createFile = useExplorerStore((s) => s.createFile);
  const createDir = useExplorerStore((s) => s.createDir);
  const renameNode = useExplorerStore((s) => s.renameNode);
  const deleteNode = useExplorerStore((s) => s.deleteNode);
  const startEditing = useExplorerStore((s) => s.startEditing);
  const cancelEditing = useExplorerStore((s) => s.cancelEditing);
  const importFiles = useExplorerStore((s) => s.importFiles);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleBlankContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const entries = await readDropItems(e.dataTransfer);
    if (entries.length > 0) {
      try {
        await importFiles(entries, currentPath);
      } catch { /* error logged in store */ }
    }
  }, [importFiles, currentPath]);

  const buildMenuItems = useCallback((): MenuItem[] => {
    if (!contextMenu) return [];
    const node = contextMenu.node;

    if (!node) {
      return [
        { label: t("explorer.newFile"), icon: <File className="w-3 h-3" />, onClick: () => startEditing(currentPath, "newFile") },
        { label: t("explorer.newFolder"), icon: <FolderPlus className="w-3 h-3" />, onClick: () => startEditing(currentPath, "newDir") },
        { label: t("explorer.refresh"), icon: <RefreshCw className="w-3 h-3" />, onClick: listRootDir, divider: true },
      ];
    }

    const items: MenuItem[] = [];
    if (node.type === "directory") {
      items.push(
        { label: t("explorer.newFile"), icon: <File className="w-3 h-3" />, onClick: () => startEditing(node.path, "newFile") },
        { label: t("explorer.newFolder"), icon: <FolderPlus className="w-3 h-3" />, onClick: () => startEditing(node.path, "newDir") },
      );
    }
    items.push(
      { label: t("explorer.rename"), icon: <Pencil className="w-3 h-3" />, onClick: () => startEditing(node.path, "rename"), divider: items.length > 0 },
      { label: t("explorer.delete"), icon: <Trash2 className="w-3 h-3" />, onClick: () => setPendingDelete(node.path), danger: true },
      { label: t("explorer.copyPath"), icon: <Copy className="w-3 h-3" />, onClick: () => navigator.clipboard.writeText(node.path) },
    );
    return items;
  }, [contextMenu, currentPath, listRootDir, startEditing, t]);

  const handleSubmitEdit = useCallback(
    (value: string) => {
      if (!editingNode) return;
      if (editingNode.type === "rename") {
        renameNode(editingNode.path, value);
      } else if (editingNode.type === "newFile") {
        createFile(editingNode.path, value);
      } else if (editingNode.type === "newDir") {
        createDir(editingNode.path, value);
      }
    },
    [editingNode, renameNode, createFile, createDir],
  );

  const isRootEditing =
    editingNode &&
    editingNode.path === currentPath &&
    (editingNode.type === "newFile" || editingNode.type === "newDir");

  const header = (
    <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide border-b border-[var(--color-border-primary)] flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Folder className="w-3.5 h-3.5" />
        {t("explorer.title")}
      </div>
      <PinButton />
    </div>
  );

  const content = (
    <>
      {header}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex gap-2 p-2 border-b border-[var(--color-border-primary)]">
          <input
            type="text"
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && listRootDir()}
            placeholder={t("explorer.pathPlaceholder")}
            className="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-primary)] border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            onClick={listRootDir}
            className="px-2 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors"
            title={t("explorer.listDirectory")}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto p-1 transition-colors ${
            isDragOver ? "bg-[var(--color-accent)]/30 ring-1 ring-inset ring-[var(--color-accent)]/50" : ""
          }`}
          onContextMenu={handleBlankContextMenu}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {treeNodes.length === 0 ? (
            <div className="text-[var(--color-text-placeholder)] text-xs text-center py-4">{t("explorer.emptyHint")}</div>
          ) : (
            <ul className="space-y-0.5">
              {treeNodes.map((node) => (
                <TreeNodeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  editingNode={editingNode}
                  onToggle={toggleNode}
                  onOpenFile={openFile}
                  onContextMenu={handleContextMenu}
                  onSubmitEdit={handleSubmitEdit}
                  onCancelEdit={cancelEditing}
                />
              ))}
              {isRootEditing && (
                <InlineInput
                  depth={0}
                  onSubmit={handleSubmitEdit}
                  onCancel={cancelEditing}
                />
              )}
            </ul>
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("explorer.confirmDelete")}
          message={t("explorer.confirmDeleteMessage", { name: pendingDelete.split("/").pop() })}
          onConfirm={() => {
            deleteNode(pendingDelete);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );

  if (hideOuterShell) {
    return <div className="flex flex-col flex-1 overflow-hidden">{content}</div>;
  }

  return (
    <div className="w-60 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0">
      {content}
    </div>
  );
}
