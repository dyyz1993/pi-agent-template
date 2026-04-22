---
alwaysApply: false
---
# 日志工具指南

## 为什么不用 console.log？

`console.log` 无法：
- 输出到文件（无法查看历史）
- 分类日志级别
- 控制日志格式

## 推荐工具：pino

pino 是高性能 JSON 日志库，支持：
- 同时输出到终端和文件
- 自动日志轮转
- 结构化日志便于查询

## 使用方式

```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    targets: [
      { target: 'pino/file', options: { destination: 1 } }, // stdout
      { target: 'pino/file', options: { destination: 'logs/app.log' } },
    ],
  },
});

// 使用
logger.info('应用启动');
logger.error({ err }, '发生错误');
logger.debug('调试信息'); // 仅在 DEBUG 模式显示
```

## 安装

```bash
bun add pino
bun add -D @types/pino
```

## 常用级别

| 级别 | 使用场景 |
|------|---------|
| `logger.info()` | 一般信息（启动、配置） |
| `logger.warn()` | 警告（性能问题、非致命错误） |
| `logger.error()` | 错误（需处理的问题） |
| `logger.debug()` | 调试（开发时查看，production 关闭） |

## 查看日志

```bash
# 实时查看
tail -f logs/app.log

# 搜索错误
grep '"level":50' logs/app.log

# 统计
cat logs/app.log | jq '.level' | sort | uniq -c
```
