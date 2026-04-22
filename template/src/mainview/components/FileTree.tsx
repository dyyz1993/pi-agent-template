import { createSignal, For, Show, onMount } from 'solid-js';
import { rpc, type FileEntry } from '../lib/rpc';

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onFileClick: (path: string) => void;
  activePath: string | null;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#61dafb',
    json: '#f5a623', html: '#e44d26', css: '#264de4', md: '#519aba',
    sh: '#89e051', png: '#a074c4', jpg: '#a074c4',
  };
  const color = icons[ext] || '#808080';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
    </svg>
  );
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / (1024 * 1024)).toFixed(1) + 'M';
}

export function TreeNode(props: TreeNodeProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [children, setChildren] = createSignal<FileEntry[]>([]);
  const [loading, setLoading] = createSignal(false);

  const toggle = async () => {
    if (props.entry.type !== 'directory') return;
    if (expanded()) {
      setExpanded(false);
      return;
    }
    if (children().length === 0) {
      setLoading(true);
      try {
        const result = await rpc.listDir(props.entry.path);
        setChildren(result.entries);
      } catch (e) {
        console.error('listDir error:', e);
      }
      setLoading(false);
    }
    setExpanded(true);
  };

  const handleClick = () => {
    if (props.entry.type === 'directory') {
      toggle();
    } else {
      props.onFileClick(props.entry.path);
    }
  };

  return (
    <>
      <div
        class={`tree-item depth-${props.depth}`}
        classList={{ active: props.activePath === props.entry.path }}
        onClick={handleClick}
      >
        <span class="icon">
          {props.entry.type === 'directory'
            ? (expanded() ? '📂' : '📁')
            : getFileIcon(props.entry.name)}
        </span>
        <span class="name">{props.entry.name}</span>
        <Show when={loading()}>
          <span class="loading">⏳</span>
        </Show>
        <Show when={props.entry.size}>
          <span class="size">{formatSize(props.entry.size)}</span>
        </Show>
      </div>
      <Show when={expanded()}>
        <For each={children()}>
          {(child) => (
            <TreeNode
              entry={child}
              depth={props.depth + 1}
              onFileClick={props.onFileClick}
              activePath={props.activePath}
            />
          )}
        </For>
      </Show>
    </>
  );
}

export function FileTree(props: {
  onFileClick: (path: string) => void;
  activePath: string | null;
}) {
  const [entries, setEntries] = createSignal<FileEntry[]>([]);
  const [loading, setLoading] = createSignal(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await rpc.listDir('.');
      setEntries(result.entries);
    } catch (e) {
      console.warn('refresh error:', e);
    }
    setLoading(false);
  };

  onMount(() => { refresh(); });

  return (
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>📁 Files</h2>
        <button class="btn-icon" onClick={refresh} title="Refresh">
          {loading() ? '⏳' : '🔄'}
        </button>
      </div>
      <div class="file-tree">
        <For each={entries()}>
          {(entry) => (
            <TreeNode
              entry={entry}
              depth={0}
              onFileClick={props.onFileClick}
              activePath={props.activePath}
            />
          )}
        </For>
      </div>
    </div>
  );
}
