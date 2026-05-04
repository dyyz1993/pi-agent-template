import { resolve } from "path";

let allowedRoots: string[] = [process.cwd()];

export function setAllowedRoots(roots: string[]): void {
  allowedRoots = roots.map((r) => resolve(r));
}

export function isRpcPathAllowed(requestedPath: string): boolean {
  try {
    if (requestedPath.includes("\0")) return false;

    const decoded = decodeURIComponent(requestedPath);
    const resolved = resolve(decoded);
    return allowedRoots.some(
      (root) => resolved === root || resolved.startsWith(root + "/")
    );
  } catch {
    return false;
  }
}

export function validatePath(requestedPath: string): string {
  if (requestedPath.includes("\0")) {
    throw new Error(`Access denied: path contains null bytes`);
  }

  const decoded = decodeURIComponent(requestedPath);
  const resolved = resolve(decoded);

  if (!isRpcPathAllowed(resolved)) {
    throw new Error(
      `Access denied: path "${requestedPath}" is outside allowed roots`
    );
  }

  return resolved;
}
