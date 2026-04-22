import { createSignal, Show, For } from 'solid-js';
import { rpc } from '../lib/rpc';
import type { OpenFile } from '../lib/rpc';
import * as Diff from 'diff';

export interface OpenFile {
  path: string;
  content: string;
  size: number;
  type: 'text' | 'binary' | 'large';
  url?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / (1024 * 1024)).toFixed(1) + 'M';
}

export function FileViewer(props: {
  files: Record<string, OpenFile>;
  activePath: string | null;
  onClose: (path: string) => void;
  onSwitch: (path: string) => void;
}) {
  const openPaths = () => Object.keys(props.files);

  return (
    <div class="content">
      <div class="tabs">
        <div
          class="tab"
          classList={{ active: props.activePath === null }}
          onClick={() => props.onSwitch('')}
        >
          ⚡ RPC
        </div>
        <For each={openPaths()}>
          {(path) => {
            const name = path.split('/').pop() || path;
            return (
              <div
                class="tab"
                classList={{ active: props.activePath === path }}
                onClick={() => props.onSwitch(path)}
              >
                {name}
                <span class="close-tab" onClick={(e) => { e.stopPropagation(); props.onClose(path); }}>✕</span>
              </div>
            );
          }}
        </For>
      </div>

      <Show when={props.activePath && props.files[props.activePath!]} keyed>
        {(path) => {
          const file = () => props.files[path];
          return (
            <div class="file-viewer">
              <div class="file-toolbar">
                <span class="file-path">{path}</span>
                <span class="file-size">{formatSize(file().size)}</span>
                <Show when={file().type !== 'text'}>
                  <a class="btn download-btn" href={file().url} target="_blank" rel="noopener">⬇ Download</a>
                </Show>
              </div>
              <Show when={file().type === 'text'} fallback={
                <div class="file-content binary-hint">
                  {file().type === 'binary' ? '📦 Binary file' : `📦 Large file (${formatSize(file().size)})`}
                </div>
              }>
                <div class="file-content">
                  <For each={file().content.split('\n')}>
                    {(line, i) => (
                      <div class="line">
                        <span class="line-num">{i() + 1}</span>
                        <span class="line-text">{line}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          );
        }}
      </Show>

      <Show when={!props.activePath}>
        <div class="rpc-panel">
          <RPCPanel />
        </div>
      </Show>
    </div>
  );
}

function RPCPanel() {
  const [method, setMethod] = createSignal('hello');
  const [params, setParams] = createSignal('{"name": "World"}');
  const [logs, setLogs] = createSignal<{ msg: string; type: string; time: string }[]>([]);
  const [subscribed, setSubscribed] = createSignal(false);
  const [eventType, setEventType] = createSignal('heartbeat');
  let subId: string | null = null;

  const addLog = (msg: unknown, type: string) => {
    const time = new Date().toLocaleTimeString();
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    setLogs((prev) => [...prev.slice(-100), { msg: text, type, time }]);
  };

  const selectMethod = (m: string) => {
    setMethod(m);
    const defaults: Record<string, string> = {
      hello: '{"name": "World"}',
      echo: '{"message": "Hello RPC!"}',
      ping: '',
      listDir: '{"path": "."}',
      readFile: '{"path": "package.json"}',
    };
    setParams(defaults[m] || '');
  };

  const callRPC = async () => {
    let p;
    try { p = params() ? JSON.parse(params()) : undefined; }
    catch { addLog('Invalid JSON', 'err'); return; }
    addLog({ method: method(), params: p }, 'sent');
    try {
      const result = await rpc.call(method(), p);
      addLog(result, 'recv');
    } catch (e) {
      addLog((e as Error).message, 'err');
    }
  };

  const toggleSub = () => {
    if (subscribed() && subId) {
      rpc.unsubscribe(subId);
      setSubscribed(false);
      subId = null;
      addLog('Unsubscribed', 'info');
    } else {
      subId = rpc.subscribe(eventType(), {}, (event: unknown) => {
        addLog(event, 'event');
      });
      setSubscribed(true);
      addLog('Subscribed: ' + eventType(), 'info');
    }
  };

  const methods = ['hello', 'echo', 'ping', 'listDir', 'readFile'];

  return (
    <div>
      <h3>RPC Call</h3>
      <div class="row">
        <label>Method</label>
        <div class="methods">
          <For each={methods}>
            {(m) => (
              <button
                class="method-btn"
                classList={{ active: method() === m }}
                onClick={() => selectMethod(m)}
              >
                {m}
              </button>
            )}
          </For>
        </div>
      </div>
      <div class="row">
        <label>Params</label>
        <textarea value={params()} onInput={(e) => setParams(e.currentTarget.value)} />
      </div>
      <div class="row">
        <label></label>
        <button class="btn" onClick={callRPC} disabled={!rpc.connected()}>🚀 Call</button>
      </div>

      <h3>Subscribe</h3>
      <div class="row">
        <label>Event</label>
        <input value={eventType()} onInput={(e) => setEventType(e.currentTarget.value)} />
        <button
          class={subscribed() ? 'btn danger' : 'btn success'}
          onClick={toggleSub}
          disabled={!rpc.connected()}
        >
          {subscribed() ? 'Unsubscribe' : 'Subscribe'}
        </button>
      </div>

      <h3 class="mt3">Log</h3>
      <div class="log">
        <For each={logs()}>
          {(entry) => (
            <div class={`log-entry ${entry.type}`}>
              <span class="time">{entry.time}</span>
              <span class={`tag ${entry.type}`}>{entry.type.toUpperCase()}</span>
              <pre>{entry.msg}</pre>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function DiffViewer(props: { oldText: string; newText: string; fileName?: string }) {
  const changes = () => Diff.diffLines(props.oldText, props.newText);

  return (
    <div class="diff-viewer">
      <Show when={props.fileName}>
        <div class="diff-header">{props.fileName}</div>
      </Show>
      <div class="diff-content">
        <For each={changes()}>
          {(part, _i) => {
            const changeType = () => {
              if (part.added) return 'add';
              if (part.removed) return 'delete';
              return 'context';
            };
            const lines = () => (part.value || '').split('\n').filter((l, idx, arr) => idx < arr.length - 1 || l !== '');
            return (
              <For each={lines()}>
                {(line) => (
                  <div class={`diff-line diff-${changeType()}`}>
                    <span class="diff-prefix">
                      {part.added ? '+' : part.removed ? '-' : ' '}
                    </span>
                    <span class="diff-text">{line}</span>
                  </div>
                )}
              </For>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export type { OpenFile };
