export function stableTaskFileStem(title: string, fallback: string): string {
  const stem = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return stem || fallback;
}

export function isNumericConflictBasename(
  fileBasename: string,
  title: string,
  fallback: string,
): boolean {
  const stem = stableTaskFileStem(title, fallback);
  return fileBasename !== stem &&
    fileBasename.startsWith(`${stem} `) &&
    /^(?:\d+)(?: \d+)*$/.test(fileBasename.slice(stem.length + 1));
}

export function renameOperationKey(oldPath: string, newPath: string): string {
  return `${oldPath}\u0000${newPath}`;
}

export function chooseStableMarkdownPath(
  folder: string,
  title: string,
  currentPath: string | undefined,
  isOccupied: (path: string) => boolean,
  fallback: string,
): string {
  const stem = stableTaskFileStem(title, fallback);
  const canonicalPath = `${folder}/${stem}.md`;

  if (currentPath) {
    const separator = currentPath.lastIndexOf("/");
    const currentFolder = separator >= 0 ? currentPath.slice(0, separator) : "";
    const currentFile = separator >= 0 ? currentPath.slice(separator + 1) : currentPath;
    const currentBasename = currentFile.endsWith(".md")
      ? currentFile.slice(0, -3)
      : currentFile;
    if (
      currentFolder === folder &&
      isOccupied(canonicalPath) &&
      isNumericConflictBasename(currentBasename, title, fallback)
    ) {
      return currentPath;
    }
  }

  let path = canonicalPath;
  let suffix = 2;
  while (isOccupied(path) && path !== currentPath) {
    path = `${folder}/${stem} ${suffix}.md`;
    suffix += 1;
  }
  return path;
}
