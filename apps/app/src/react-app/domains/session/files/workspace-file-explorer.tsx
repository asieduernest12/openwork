/** @jsxImportSource react */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Download,
  X,
} from "lucide-react";

import type { OpenworkServerClient } from "../../../../app/lib/openwork-server";
import type { FileTreeNode } from "../../../../app/lib/workspace-files";
import {
  fetchWorkspaceFileTree,
  fetchWorkspaceFileContent,
  formatFileSize,
  formatRelativeTime,
} from "../../../../app/lib/workspace-files";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownBlock } from "../surface/markdown";
import { openDesktopPath } from "../../../../app/lib/desktop";

type FileExplorerProps = {
  client: OpenworkServerClient;
  workspaceId: string;
  workspaceRoot: string;
  isRemoteWorkspace?: boolean;
  onClose: () => void;
};

type ExplorerMode = "tree" | "preview";

type FilePreview = {
  path: string;
  name: string;
  content?: string;
  error?: string;
  size?: number;
  updatedAt?: number;
};

const MAX_PREVIEW_BYTES = 1_000_000;
const IGNORED_DIRS = [".git", "node_modules", ".venv", "__pycache__", ".next"];

export function WorkspaceFileExplorer({
  client,
  workspaceId,
  workspaceRoot,
  isRemoteWorkspace = false,
  onClose,
}: FileExplorerProps) {
  const [mode, setMode] = useState<ExplorerMode>("tree");
  const [treePath, setTreePath] = useState("");
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const lastFetchedPathRef = useRef<string | null>(null);

  const fileFetchOptions = useMemo(
    () => ({ baseUrl: client.baseUrl, token: client.token }),
    [client.baseUrl, client.token],
  );

  useEffect(() => {
    const effectivePath = treePath || "";
    if (lastFetchedPathRef.current === effectivePath) return;

    let cancelled = false;
    lastFetchedPathRef.current = effectivePath;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const result = await fetchWorkspaceFileTree(fileFetchOptions, workspaceId, {
          path: treePath || undefined,
          depth: 1,
        });
        if (!cancelled) {
          setTree(result.children);
          const normalizedPath = result.path === "." ? "" : result.path;
          lastFetchedPathRef.current = normalizedPath;
          if (normalizedPath !== treePath) {
            setTreePath(normalizedPath);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file tree");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fileFetchOptions, workspaceId, treePath]);

  const navigateToDir = useCallback((path: string) => {
    setPreview(null);
    setTreePath(path);
  }, []);

  const openPreview = async (node: FileTreeNode) => {
    if (node.type === "directory") {
      navigateToDir(node.path);
      return;
    }

    if (node.size && node.size > MAX_PREVIEW_BYTES) {
      setPreview({ path: node.path, name: node.name, error: "File too large to preview" });
      setMode("preview");
      return;
    }

    setPreviewLoading(true);
    setPreview({ path: node.path, name: node.name });

    try {
      const result = await fetchWorkspaceFileContent(fileFetchOptions, workspaceId, node.path);
      setPreview({
        path: node.path,
        name: node.name,
        content: result.content,
        size: result.bytes,
        updatedAt: result.updatedAt,
      });
    } catch (err) {
      setPreview({
        path: node.path,
        name: node.name,
        error: err instanceof Error ? err.message : "Failed to load file",
      });
    } finally {
      setPreviewLoading(false);
    }

    setMode("preview");
  };

  const goBack = () => {
    const parentPath = treePath.includes("/") ? treePath.substring(0, treePath.lastIndexOf("/")) : "";
    navigateToDir(parentPath);
    setMode("tree");
  };

  const openExternal = async () => {
    if (!preview) return;
    const fullPath = `${workspaceRoot}/${preview.path}`;
    if (isRemoteWorkspace) {
      try {
        const result = await client.downloadWorkspaceFile(workspaceId, preview.path);
        const url = URL.createObjectURL(
          new Blob([result.data], { type: result.contentType ?? "application/octet-stream" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = preview.name;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        setPreview((prev) => prev ? { ...prev, error: "Failed to download file" } : null);
      }
    } else {
      void openDesktopPath(fullPath);
    }
  };

  const downloadFile = async () => {
    if (!preview) return;
    const result = await client.downloadWorkspaceFile(workspaceId, preview.path);
    const url = URL.createObjectURL(
      new Blob([result.data], { type: result.contentType ?? "application/octet-stream" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = preview.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderTree = (nodes: FileTreeNode[]) => {
    return nodes.map((node) => {
      const isIgnoredDir = node.type === "directory" && IGNORED_DIRS.includes(node.name);

      if (isIgnoredDir) return null;

      return (
        <div key={node.path}>
          <div
            className={cn(
              "group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted",
              preview?.path === node.path && "bg-muted",
            )}
            onClick={() => (node.type === "directory" ? navigateToDir(node.path) : openPreview(node))}
          >
            {node.type === "directory" ? (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                <Folder className="size-4 shrink-0 text-muted-foreground" />
              </>
            ) : (
              <>
                <span className="size-3.5 shrink-0" />
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {node.type === "file" && node.size ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatFileSize(node.size)}</span>
            ) : null}
          </div>
        </div>
      );
    });
  };

  const renderPreview = () => {
    if (!preview) return null;

    if (previewLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (preview.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{preview.error}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openExternal}>
              <ExternalLink className="mr-1 size-3.5" />
              Open externally
            </Button>
            <Button size="sm" variant="outline" onClick={downloadFile}>
              <Download className="mr-1 size-3.5" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    const isMarkdown = preview.name.toLowerCase().endsWith(".md") || preview.name.toLowerCase().endsWith(".mdx");

    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate">{preview.name}</span>
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {preview.path}
              {preview.size ? ` · ${formatFileSize(preview.size)}` : ""}
              {preview.updatedAt ? ` · ${formatRelativeTime(preview.updatedAt)}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" onClick={openExternal} title="Open externally">
              <ExternalLink className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={downloadFile} title="Download">
              <Download className="size-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {isMarkdown ? (
            <div className="p-4">
              <MarkdownBlock text={preview.content ?? ""} />
            </div>
          ) : (
            <pre className="overflow-auto p-4 text-sm font-mono whitespace-pre-wrap break-words">
              {preview.content}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2">
        <div className="flex items-center gap-1 text-sm font-medium text-foreground">
          {mode === "preview" ? (
            <Button size="icon-sm" variant="ghost" onClick={goBack}>
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          <span className="truncate">
            {mode === "preview" ? preview?.name : "Files"}
          </span>
        </div>
        {mode === "tree" ? (
          <span className="ml-auto text-[11px] text-muted-foreground">
            {treePath ? `/${treePath}` : "/"}
          </span>
        ) : null}
        <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "tree" ? (
          <div className="flex h-full flex-col">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle className="size-8 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto py-2">
                {renderTree(tree)}
                {tree.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No files found
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );
}
