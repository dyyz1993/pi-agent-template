---
globs: "**/*.test.ts, **/*.spec.ts, **/*.test.tsx"
keywords: test, vitest, playwright, mock
match: any
---

# 测试规范

- 测试文件与源文件同目录，命名 `xxx.test.ts`
- 使用 describe/it 组织，每个 it 只验证一个行为
- Mock 外部依赖，禁止依赖网络请求
- AAA 模式：Arrange → Act → Assert
- E2E 测试用 `data-testid` 定位元素，禁止依赖文本内容
- Vitest 单元测试 / Playwright E2E 测试，不要混用

```ts
// ✅ 结构
describe("feature", () => {
	it("should do X when Y", () => {
		// Arrange
		// Act
		// Assert
	});
});
```
