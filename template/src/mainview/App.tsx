import { useState, useEffect, useCallback, useRef } from 'react';

interface FileEntry { name: string; path: string; type: 'file' | 'directory'; size?: number; modified?: number; children?: FileEntry[]; }

const isDesktop = () => !!(window as unknown as { __electrobunBunBridge?: unknown }).__electrobunBunBridge;
const wsUrl = isDesktop() ? 'ws://localhost:3000' : (location.port === '8080' ? 'ws://localhost:3000' : `ws://${location.host}`);
const WORKSPACE_ROOT = '/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2/templates/pi-agent-template';

function normalizePath(p: string): string {
  if (p.startsWith(WORKSPACE_ROOT)) {
    return p.substring(WORKSPACE_ROOT.length + 1);
  }
  return p;
}

function pathMatches(entryPath: string, searchPath: string): boolean {
  return entryPath === searchPath || entryPath === normalizePath(searchPath);
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    ts:'#3178c6', tsx:'#3178c6', js:'#f7df1e', jsx:'#61dafb',
    json:'#f5a623', html:'#e44d26', css:'#264de4', md:'#519aba',
    sh:'#89e051', png:'#a074c4', jpg:'#a074c4', svg:'#ffb13b',
    rs:'#dea584', go:'#00acd7', py:'#3572A5', toml:'#9c4221',
    lock:'#8a8a8a', yml:'#cb171e', yaml:'#cb171e',
  };
  const color = colors[ext] || '#808080';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
    </svg>
  );
}
function FolderIcon({ opened }: { opened: boolean }) {
  if (opened) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <path d="M2 10h20"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6c7086" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }}
    >
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

interface TreeItemProps {
  entry: FileEntry;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  activePath: string | null;
}

function TreeItem({ entry, depth, expandedPaths, onToggle, onFileClick, activePath }: TreeItemProps) {
  const isDir = entry.type === 'directory';
  const normPath = (p: string) => p.startsWith(WORKSPACE_ROOT) ? p.substring(WORKSPACE_ROOT.length + 1) : p;
  const isExpanded = isDir && [...expandedPaths].some(p => p === entry.path || p === normPath(entry.path));
  const isActive = activePath === entry.path;
  const indent = 8 + depth * 16;

  return (
    <div>
      <div
        className={`tree-row ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => {
          if (isDir) { onToggle(entry.path); }
          else { onFileClick(entry.path); }
        }}
      >
        <span className="chevron">
          {isDir ? <ChevronIcon expanded={isExpanded} /> : <span style={{ width: 12 }} />}
        </span>
        <span className="file-icon">{isDir ? <FolderIcon opened={isExpanded} /> : <FileIcon name={entry.name} />}</span>
        <span className="file-name">{entry.name}</span>
      </div>
      {isDir && isExpanded && entry.children?.map(child => (
        <TreeItem
          key={child.path}
          entry={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onFileClick={onFileClick}
          activePath={activePath}
        />
      ))}
    </div>
  );
}

interface AppState {
  connected: boolean;
  files: FileEntry[];
  openFiles: Record<string, { type: string; content?: string; url?: string; path: string; size: number }>;
  activePath: string | null;
  logs: { msg: unknown; type: string; time: string }[];
  selectedMethod: string;
  params: string;
  subscribed: boolean;
  subId: string | null;
  loginError: string;
  showDiff: boolean;
  showLogin: boolean;
  expandedPaths: Set<string>;
}

function App() {
  const [state, setState] = useState<AppState>({
    connected: false, files: [], openFiles: {}, activePath: null,
    logs: [], selectedMethod: 'hello', params: '{"name": "World"}',
    subscribed: false, subId: null, loginError: '', showDiff: false, showLogin: true, expandedPaths: new Set(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Record<string, (v: unknown) => void>>({});
  const reqIdRef = useRef(0);
  const filesRef = useRef<FileEntry[]>([]);

  const update = useCallback((patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch } as Partial<AppState> & AppState));
  }, []);

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const wsCall = useCallback(<T,>(method: string, ps?: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = String(++reqIdRef.current);
      pendingRef.current[id] = resolve as (v: unknown) => void;
      sendWs({ type: 'request', id, method, params: ps });
      setTimeout(() => {
        if (pendingRef.current[id]) { delete pendingRef.current[id]; reject(new Error('Request timeout: ' + method)); }
      }, 10000);
    });
  }, [sendWs]);

  const addLog = useCallback((msg: unknown, type: string) => {
    update({ logs: [...state.logs.slice(-99), { msg, type, time: new Date().toLocaleTimeString() }] });
  }, [state.logs, update]);

  const updateTreeChildren = useCallback((files: FileEntry[], path: string, children: FileEntry[]): FileEntry[] => {
    return files.map(f => {
      if (pathMatches(f.path, path)) {
        return { ...f, children: children };
      }
      if (f.children) {
        return { ...f, children: updateTreeChildren(f.children, path, children) };
      }
      return f;
    });
  }, []);

  const handleToggle = useCallback(async (path: string) => {
    const isExp = state.expandedPaths.has(path);
    if (isExp) {
      update({ expandedPaths: new Set([...state.expandedPaths].filter(p => p !== path)) });
    } else {
      const normPath = (p: string) => p.startsWith(WORKSPACE_ROOT) ? p.substring(WORKSPACE_ROOT.length + 1) : p;
      const matchesEntry = (entryPath: string, searchPath: string) => entryPath === searchPath || entryPath === normPath(searchPath);

      let children: FileEntry[] = [];
      if (filesRef.current.length > 0) {
        const findInTree = (files: FileEntry[]): FileEntry | null => {
          for (const f of files) {
            if (matchesEntry(f.path, path)) return f;
            if (f.children) { const found = findInTree(f.children); if (found) return found; }
          }
          return null;
        };
        const found = findInTree(filesRef.current);
        if (found?.children && found.children.length > 0) {
          children = found.children;
        }
      }
      if (children.length === 0) {
        try {
          const result = await wsCall<{ entries?: FileEntry[] }>('listDir', { path });
          children = (result.entries || []).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        } catch (e) { addLog(String(e), 'err'); return; }
      }
      const updateInTree = (files: FileEntry[]): FileEntry[] => {
        return files.map(f => {
          if (matchesEntry(f.path, path)) {
            return { ...f, children: children };
          }
          if (f.children) {
            return { ...f, children: updateInTree(f.children) };
          }
          return f;
        });
      };
      const newFiles = updateInTree(filesRef.current);
      filesRef.current = newFiles;
      const newExpanded = new Set(state.expandedPaths);
      newExpanded.add(path);
      update({ files: [...newFiles], expandedPaths: newExpanded });
    }
  }, [state.expandedPaths, wsCall, addLog, update]);

  const handleFileClick = useCallback(async (path: string) => {
    if (state.openFiles[path]) {
      update({ activePath: path });
      return;
    }
    try {
      const info = await wsCall<{ type: string; content?: string; url?: string; path: string; size: number }>('readFile', { path });
      update({ openFiles: { ...state.openFiles, [path]: info }, activePath: path });
    } catch (e) { addLog(String(e), 'err'); }
  }, [state.openFiles, wsCall, addLog, update]);

  const handleConnect = useCallback((token: string) => {
    const fullUrl = wsUrl + (token ? `?token=${encodeURIComponent(token)}` : '');
    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      update({ connected: true, showLogin: false });
      wsCall<{ entries: FileEntry[] }>('listDir', { path: '.' }).then(result => {
        const sorted = result.entries.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        filesRef.current = sorted;
        update({ files: sorted });
      }).catch(e => addLog(String(e), 'err'));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'response' && msg.id && pendingRef.current[msg.id]) {
          const resolve = pendingRef.current[msg.id];
          delete pendingRef.current[msg.id];
          resolve(msg.result || msg.error);
        }
        if (msg.type === 'event') { addLog(msg, 'event'); }
      } catch { /* ignore parse errors */ }
    };
    ws.onclose = () => { update({ connected: false, showLogin: true }); };
    ws.onerror = () => { update({ loginError: 'Connection failed' }); };
  }, [wsCall, addLog, update]);

  useEffect(() => {
    if (isDesktop()) {
      handleConnect('local');
    } else {
      const saved = localStorage.getItem('pi_agent_token');
      if (saved) { handleConnect(saved); }
      else { update({ showLogin: true }); }
    }
  }, []);

  const handleCall = useCallback(async () => {
    let p: unknown;
    try { p = JSON.parse(state.params); } catch { p = undefined; }
    addLog({ method: state.selectedMethod, params: p }, 'sent');
    try {
      const result = await wsCall(state.selectedMethod, p);
      addLog(result, 'recv');
    } catch (e) { addLog(String(e), 'err'); }
  }, [state.params, state.selectedMethod, wsCall, addLog]);

  const handleSubscribe = useCallback(() => {
    if (state.subscribed && state.subId) {
      sendWs({ type: 'unsubscribe', subscriptionId: state.subId });
      update({ subscribed: false, subId: null });
      addLog('Unsubscribed', 'info');
    } else {
      const id = String(++reqIdRef.current);
      update({ subscribed: true, subId: id });
      sendWs({ type: 'subscribe', eventType: 'heartbeat', filter: {}, subscriptionId: id });
      addLog('Subscribed: heartbeat', 'info');
    }
  }, [state.subscribed, state.subId, sendWs, addLog, update]);

  const closeFile = useCallback((path: string) => {
    const updated = { ...state.openFiles };
    delete updated[path];
    update({ openFiles: updated, activePath: state.activePath === path ? null : state.activePath });
  }, [state.openFiles, state.activePath, update]);

  const openPaths = Object.keys(state.openFiles);

  if (state.showLogin) {
    return (
      <div className="login-overlay">
        <div className="login-box">
          <h2>🔐 Pi Agent</h2>
          <p className="desc">Enter your access key to connect</p>
          {isDesktop() && <div className="local-hint">✅ Desktop — auto authenticated</div>}
          {!isDesktop() && (
            <>
              <input type="password" placeholder="Access Key" defaultValue="test-secret-token" />
              <button className="btn" onClick={() => {
                const t = (document.querySelector('input[type=password]') as HTMLInputElement)?.value.trim();
                if (!t) { update({ loginError: 'Please enter access key' }); return; }
                localStorage.setItem('pi_agent_token', t);
                handleConnect(t);
              }}>Connect</button>
            </>
          )}
          {state.loginError && <div className="error-msg">{state.loginError}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <h1>🖥️ Pi Agent</h1>
        <span className={`transport-badge ${isDesktop() ? 'ipc' : 'websocket'}`}>{isDesktop() ? 'IPC' : 'WS'}</span>
        <div className={`status-dot ${state.connected ? 'ok' : ''}`}></div>
        <span className="status-text">{state.connected ? 'Connected' : 'Disconnected'}</span>
        <div className="topbar-right">
          <span className="user-name">{isDesktop() ? '👤 Desktop' : '👤 Remote'}</span>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('pi_agent_token'); wsRef.current?.close(); update({ showLogin: true }); }}>Logout</button>
          {openPaths.length >= 2 && <button className="btn" style={{ background: '#cba6f7', fontSize: 11 }} onClick={() => update({ showDiff: true })}>🔀 Diff</button>}
        </div>
      </div>

      <div className="main">
        <div className="sidebar">
          <div className="sidebar-header"><span>EXPLORER</span></div>
          <div className="file-tree">
            {state.files.map(entry => (
              <TreeItem
                key={entry.path}
                entry={entry}
                depth={0}
                expandedPaths={state.expandedPaths}
                onToggle={handleToggle}
                onFileClick={handleFileClick}
                activePath={state.activePath}
              />
            ))}
          </div>
        </div>

        <div className="content">
          <div className="tabs">
            <div className={`tab ${!state.activePath ? 'active' : ''}`} onClick={() => update({ activePath: null })}>⚡ RPC</div>
            {openPaths.map(p => {
              const name = p.split('/').pop()!;
              return (
                <div key={p} className={`tab ${state.activePath === p ? 'active' : ''}`} onClick={() => update({ activePath: p })}>
                  <FileIcon name={name} /> <span style={{ marginRight: 4 }}>{name}</span>
                  <span className="close-tab" onClick={(e) => { e.stopPropagation(); closeFile(p); }}>✕</span>
                </div>
              );
            })}
          </div>

          {!state.activePath ? (
            <div className="rpc-panel">
              <h3>RPC Call</h3>
              <div className="row">
                <label>Method</label>
                <div className="methods">
                  {['hello','echo','ping','listDir','readFile'].map(m => (
                    <button key={m} className={`method-btn ${state.selectedMethod === m ? 'active' : ''}`} onClick={() => {
                      update({ selectedMethod: m });
                      const pm: Record<string, string> = { hello:'{"name": "World"}', echo:'{"message": "Hello!"}', ping:'', listDir:'{"path": "."}', readFile:'{"path": "package.json"}' };
                      update({ params: pm[m] || '' });
                    }}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="row">
                <label>Params</label>
                <textarea value={state.params} onChange={e => update({ params: e.target.value })} />
              </div>
              <div className="row">
                <label></label>
                <button className="btn" onClick={handleCall}>🚀 Call</button>
              </div>

              <h3 className="mt3">Subscribe</h3>
              <div className="row">
                <label>Event</label>
                <input type="text" defaultValue="heartbeat" readOnly />
                <button className={`btn ${state.subscribed ? 'danger' : 'success'}`} onClick={handleSubscribe}>
                  {state.subscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
              </div>

              <h3 className="mt3">Log</h3>
              <div className="log">
                {state.logs.map((l, i) => (
                  <div key={i} className={`log-entry ${l.type}`}>
                    <span className="time">{l.time}</span>
                    <span className={`tag ${l.type}`}>{l.type.toUpperCase()}</span>
                    <pre>{typeof l.msg === 'object' ? JSON.stringify(l.msg, null, 2) : String(l.msg)}</pre>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="file-viewer">
              {(() => {
                const info = state.openFiles[state.activePath];
                if (!info) return null;
                return (
                  <>
                    <div className="file-toolbar">
                      <span className="file-path">{info.path}</span>
                      <span className="file-size">{info.size ? (info.size < 1024 ? info.size + 'B' : info.size < 1024 * 1024 ? (info.size / 1024).toFixed(1) + 'K' : (info.size / 1024 / 1024).toFixed(1) + 'M') : ''}</span>
                      {info.url && <a className="btn download-btn" href={info.url} target="_blank" rel="noopener">⬇ Download</a>}
                    </div>
                    {info.type === 'text' && info.content !== undefined ? (
                      <div className="file-content">
                        {info.content.split('\n').map((line, i) => (
                          <div key={i} className="line">
                            <span className="line-num">{i + 1}</span>
                            <span className="line-text">{line}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="binary-hint">📦 {info.type === 'binary' ? 'Binary file' : 'Large file'}</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {state.showDiff && openPaths.length >= 2 && (
        <div className="diff-overlay" onClick={() => update({ showDiff: false })}>
          <div className="diff-modal" onClick={e => e.stopPropagation()}>
            <div className="diff-modal-header">
              <h3>🔀 Diff</h3>
              <button className="btn-icon" onClick={() => update({ showDiff: false })}>✕</button>
            </div>
            <div className="diff-viewer">
              {(() => {
                const a = state.openFiles[openPaths[openPaths.length - 2]];
                const b = state.openFiles[openPaths[openPaths.length - 1]];
                if (!a?.content || !b?.content) return null;
                const DiffLib = (window as unknown as { Diff?: { diffLines: (a: string, b: string) => Array<{ value: string; added?: boolean; removed?: boolean }> } }).Diff;
                if (!DiffLib) return <div className="binary-hint">Diff library not loaded</div>;
                const d = DiffLib.diffLines(a.content, b.content);
                return d.map((part, i) => {
                  const cls = part.added ? 'diff-add' : part.removed ? 'diff-delete' : 'diff-context';
                  const prefix = part.added ? '+' : part.removed ? '-' : ' ';
                  return part.value.split('\n').filter((l, idx, arr) => idx < arr.length - 1 || l).map((line, j) => (
                    <div key={`${i}-${j}`} className={`diff-line ${cls}`}>
                      <span className="diff-prefix">{prefix}</span>
                      <span className="diff-text">{line}</span>
                    </div>
                  ));
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
