import { desktopFetch } from "./desktop";

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: number;
  children?: FileTreeNode[];
};

export type FileTreeResponse = {
  path: string;
  children: FileTreeNode[];
};

type FetchOptions = {
  baseUrl: string;
  token?: string;
};

export async function fetchWorkspaceFileTree(
  options: FetchOptions,
  workspaceId: string,
  fileOptions?: {
    path?: string;
    depth?: number;
  },
): Promise<FileTreeResponse> {
  const { baseUrl, token } = options;
  const params = new URLSearchParams();
  if (fileOptions?.path) params.set("path", fileOptions.path);
  if (fileOptions?.depth !== undefined) params.set("depth", String(fileOptions.depth));

  const url = `${baseUrl}/workspace/${workspaceId}/files/tree?${params.toString()}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await desktopFetch(url, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to fetch file tree: ${error.message || response.statusText}`);
  }

  return response.json() as Promise<FileTreeResponse>;
}

export function getTreeDisplayName(node: FileTreeNode): string {
  return node.name;
}

export function isTextFile(node: FileTreeNode): boolean {
  if (node.type !== "file") return false;
  const textExtensions = [
    ".md",
    ".mdx",
    ".markdown",
    ".csv",
    ".tsv",
    ".json",
    ".jsonc",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".html",
    ".htm",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".scss",
    ".txt",
    ".log",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
    ".ini",
    ".cfg",
    ".conf",
    ".env",
    ".gitignore",
    ".dockerignore",
    ".editorconfig",
  ];
  return textExtensions.some((ext) => node.name.toLowerCase().endsWith(ext));
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export async function fetchWorkspaceFileContent(
  options: FetchOptions,
  workspaceId: string,
  filePath: string,
): Promise<{ path: string; content: string; bytes: number; updatedAt: number }> {
  const { baseUrl, token } = options;
  const params = new URLSearchParams({ path: filePath });
  const url = `${baseUrl}/workspace/${workspaceId}/files/content?${params.toString()}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await desktopFetch(url, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to fetch file content: ${error.message || response.statusText}`);
  }

  return response.json();
}
