# BOOTSTRAP.md — 给 AI 大模型读的操作手册

> **你（AI 助手）正在阅读这份文件，说明用户把一行命令丢给了你。**
> 请严格按照下面的步骤执行。这份文件就是为你写的，用你最容易理解的方式组织。

---

## 这是什么

用户想给 pi-agent-template 项目（一套 AI Agent 桌面应用脚手架）安装一套工程化 skill。
这些 skill 会让后续开发遵循正确规范，避免踩坑。

## 你要做的事（按顺序）

### Step 1: 安装 skill 到本地

在终端执行（这是唯一需要用户授权的一次操作）：

```bash
curl -fsSL https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/skills-dist/install.sh | bash
```

如果用户网络访问 GitHub 有困难，备选方案——让用户在 pi-agent-template 项目根目录执行：

```bash
bash skills-dist/install.sh
```

**验证安装成功**：脚本会输出 "Installation Summary"，显示安装了几个 skill，以及安装路径（通常是 `~/.agents/skills/`）。看到 `✓ Installed:` 行即成功。

### Step 2: 确认 skill 已被发现

安装脚本完成后，新 skill 会出现在 `~/.agents/skills/` 下。它们会被 ZCode / Claude Code / OpenCode / Pi agent 自动发现。

**如果你（AI）在当前会话里看不到这些 skill**，告诉用户：「请重启 AI 助手 / 开一个新会话，让 skill 被重新加载」。

### Step 3: 读取 manifest，向用户介绍能力

安装完成后，你应该能看到这些 skill。读取 `~/.agents/skills/` 下每个 skill 的 `SKILL.md` 开头的 `description` 字段，然后向用户简要介绍：

> ✅ 已安装 4 个 skill：
>
> - **pi-template-create**：从零创建新模板类型
> - **pi-rpc-module-dev**：给模板加 RPC 功能模块
> - **pi-template-dev**：模板前端开发规范（主题/i18n/组件）
> - **pi-fullstack-debug**：全栈调试排查

### Step 4: 询问用户接下来想做什么

不要自作主张开始干活。用一句话问用户：

> 「这些 skill 已经就绪了。你想做什么？比如：
>
> - 创建一个新模板类型 → 用 pi-template-create
> - 给现有模板加功能 → 用 pi-rpc-module-dev
> - 改 UI / 样式 → 用 pi-template-dev
> - 排查问题 → 用 pi-fullstack-debug」

然后**根据用户的回答，调用对应的 skill**（它会指导你完成完整流程）。

---

## Skill 自动触发说明

用户不需要记 skill 名字。这些 skill 的 description 里写了触发词，正常对话就会自动匹配：

| 用户说的话                                         | 自动触发           |
| -------------------------------------------------- | ------------------ |
| "帮我加个 todo 功能" / "新增一个面板"              | pi-rpc-module-dev  |
| "我想做一个新模板" / "照着 browser-agent 再加一个" | pi-template-create |
| "改下主题颜色" / "加个英文翻译" / "写个新组件"     | pi-template-dev    |
| "页面白屏了" / "接口调不通" / "WebSocket 断连"     | pi-fullstack-debug |

## 如果用户想了解项目全貌

读取项目根目录的 `README.md`。它是项目的主文档，包含架构图、模板类型说明、RPC 框架介绍、安全特性等。

## 如果安装失败

可能的原因和处理：

1. **网络问题** → 用本地方式 `bash skills-dist/install.sh`
2. **权限问题** → `chmod +x skills-dist/install.sh` 后重试
3. **目录不存在** → install.sh 会自动 `mkdir -p`，无需手动创建

---

## 关于这些 skill 的设计哲学

- **每个 skill 解决一类完整问题**，不是碎片化的知识点
- **包含真实项目踩过的坑**（比如 browser-agent 的"半接入陷阱"写进了 pi-template-create）
- **有明确触发词**，正常对话即可触发，不需要用户记命令
- **配套 references/ 提供详细模板和清单**，skill 本身保持精炼
