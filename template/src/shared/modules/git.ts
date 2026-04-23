/**
 * Git 模块 — 版本控制操作
 */
export interface GitMethods {
  "git.status": {
    params: { repoPath: string };
    result: {
      staged: GitFileChange[];
      changed: GitFileChange[];
      untracked: string[];
      branch: string;
      ahead: number;
      behind: number;
    };
  };
  "git.diff": {
    params: { repoPath: string; filePath: string; staged?: boolean };
    result: { filePath: string; diff: string; oldContent: string; newContent: string };
  };
  "git.log": {
    params: { repoPath: string; maxCount?: number };
    result: {
      commits: {
        hash: string;
        shortHash: string;
        message: string;
        author: string;
        date: string;
      }[];
    };
  };
  "git.commitFiles": {
    params: { repoPath: string; hash: string };
    result: { files: GitFileChange[] };
  };
  "git.commitFileDiff": {
    params: { repoPath: string; hash: string; filePath: string };
    result: { filePath: string; diff: string; oldContent: string; newContent: string };
  };
}

export interface GitFileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied";
}
