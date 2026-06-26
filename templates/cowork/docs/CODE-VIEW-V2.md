# Cowork Code View V2 — 右侧边栏浏览器预览 + 元素选择器

> **核心改动**：浏览器预览从"Code Tab 全文 iframe"改为"右侧面板独立区块"。
> Code Tab 只负责地址栏和 URL 管理，实际渲染交给右栏。
> 新增元素选择器功能，支持选取页面元素并提取 CSS selector。

---

## 一、布局变化

### 当前（V1）

```
Code Tab → 中间区域 = [地址栏 + iframe 全屏]
          右栏 = 隐藏（Cowork 模式才显示）
```

### 目标（V2）

```
Code Tab → 左栏 = URL 历史
          中栏 = [地址栏 + URL 管理界面]（不渲染 iframe）
          右栏 = Progress + Artifacts + Context + 🆕 Preview 浏览器
```

---

## 二、改动清单

### 2.1 CodeView.tsx — 去掉 iframe，只留地址栏 + 管理界面

```typescript
// 当前：CodeView = AddressBar + PreviewFrame(全屏)
// 改为：CodeView = AddressBar + URL 管理（历史列表 + 快速启动）
// iframe 渲染交给右侧面板的 PreviewBlock
```

修改内容：

- 移除 `<PreviewFrame />` 渲染
- 地址栏输入 URL 后，不在这里渲染 iframe
- 改为：右侧面板自动展开 Preview 区块并加载 URL
- 地址栏保留：前进/后退/刷新/关闭按钮 + URL 输入

### 2.2 右侧面板新增 `PreviewBlock` 组件

```typescript
// 新文件：components/right/PreviewBlock.tsx
// 在 Code Tab 下显示，Cowork/Chat 模式下隐藏或折叠

export function PreviewBlock() {
  const currentTab = usePreviewStore(s => s.currentTab);
  const isCodeTab = useViewStore(s => s.centerTab === "code");

  if (!isCodeTab || !currentTab) return null; // 非 Code 模式或无标签时隐藏

  return (
    <div className="...">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span>Preview</span>
        <span className="text-xs">{currentTab.url}</span>
      </div>
      {/* 元素选择工具栏 */}
      <ElementPickerToolbar />
      {/* iframe 浏览器 */}
      <PreviewFrame tab={currentTab} useIframe={true} />
      {/* 选中的元素选择器 */}
      <SelectedElementBar />
    </div>
  );
}
```

### 2.3 新增 `ElementPicker` 元素选择器

```typescript
// 新文件：components/right/ElementPicker.tsx
// 注入 JS 到 iframe，实现 inspect 模式

export function ElementPicker() {
  const [active, setActive] = useState(false);
  const [selectedSelector, setSelectedSelector] = useState("");

  const togglePicker = () => {
    setActive(!active);
    // 通过 postMessage 向 iframe 注入 inspect 脚本
    iframeRef.contentWindow.postMessage({
      type: "TOGGLE_INSPECT",
      active: !active,
    }, "*");
  };

  const copyToInput = () => {
    // 将 selector 添加到聊天输入框
    // 通过 clipboard 或直接写入 store
    navigator.clipboard.writeText(selectedSelector);
  };

  return (
    <div className="...">
      <button onClick={togglePicker} className={active ? "active" : ""}>
        🎯 选取元素
      </button>
      {selectedSelector && (
        <div>
          <code>{selectedSelector}</code>
          <button onClick={copyToInput}>📋 添加到输入框</button>
        </div>
      )}
    </div>
  );
}
```

#### 元素选择器技术方案

跨域问题：对于同源页面（`localhost`），可以直接用 `iframe.contentDocument`；
对于非同源页面，需要：

1. 在 iframe URL 后拼接 `?inspector=1`，让目标页面加载一个 inject script
2. 或者后端代理请求，注入 inspect JS
3. MVP 阶段：**只支持同源（localhost）页面**的元素选取，用 `postMessage` + iframe 内容脚本

```
用户点击"选取元素"
  ↓
iframe 加载注入脚本（同源时直接操作 DOM）
  ↓
用户 hover/click 元素 → 高亮 + 提取 CSS selector
  ↓
postMessage({type: "ELEMENT_SELECTED", selector: ".btn-primary"}) 发回主页面
  ↓
ElementPicker 显示 selector，用户点击"添加到输入框"
  ↓
selector 写入聊天输入框
```

### 2.4 AppLayout 更新 — 右侧面板根据 Tab 显示不同内容

```typescript
// 右栏内容分区：
// Cowork 模式：Progress + Artifacts + Context
// Code 模式：Progress + Preview(替换 Context) + Artifacts
// Chat 模式：隐藏

{showRightPanel && centerTab === "cowork" && (
  <div className="w-[300px] ...">
    <ProgressPanel />
    <ArtifactsPanel />
    <ContextPanel />
  </div>
)}
{showRightPanel && centerTab === "code" && (
  <div className="w-[300px] ...">
    <ProgressPanel />
    <ArtifactsPanel />
    <PreviewBlock />  {/* 新增 */}
  </div>
)}
```

### 2.5 交互流程

```
用户在聊天中让 AI 帮忙调试前端
  → AI 回复："在 localhost:5173 看一下效果"
  → 用户切换到 Code Tab
  → 地址栏已填入 localhost:5173（或用户手动输入）
  → 右侧 Preview 区块加载网页
  → 用户点"选取元素"
  → 在 iframe 中 hover 按钮，高亮显示
  → 点击 → 提取到 .btn-submit 选择器
  → "添加到输入框" → 聊天输入框出现 ".btn-submit"
  → 用户发送："这个 .btn-submit 按钮的样式有点问题"
```

---

## 三、文件清单

| 操作 | 文件                                              | 说明                                       |
| ---- | ------------------------------------------------- | ------------------------------------------ |
| 🆕   | `src/mainview/components/right/PreviewBlock.tsx`  | 右侧预览区块（标题 + 工具栏 + iframe）     |
| 🆕   | `src/mainview/components/right/ElementPicker.tsx` | 元素选择器（inspect 模式 + selector 提取） |
| ✏️   | `src/mainview/components/code/CodeView.tsx`       | 去掉 iframe 渲染，只留地址栏 + URL 管理    |
| ✏️   | `src/mainview/components/layout/AppLayout.tsx`    | 右侧面板根据 Tab 显示不同内容              |
| ✏️   | `src/mainview/stores/use-preview-store.ts`        | 可能需要加 selectElement action            |

---

## 四、Phase 2（可选）

- iframe inspect 脚本注入方案（支持非同源页面）
- 页面截图预览（替代完整 iframe，省内存）
- 多标签浏览器标签栏
