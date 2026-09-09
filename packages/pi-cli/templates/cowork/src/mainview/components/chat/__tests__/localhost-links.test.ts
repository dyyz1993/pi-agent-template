import { describe, it, expect } from 'vitest';

// 纯函数测试：只验证链接解析逻辑，不依赖 React/Store
// 通过动态导入避免拉起整个组件树
async function loadSplitter() {
	const mod = await import('../TaskChat');
	return mod.splitLocalhostLinks;
}

describe('splitLocalhostLinks', () => {
	it('returns single text segment when no localhost link present', async () => {
		const split = await loadSplitter();
		const result = split('hello world, nothing to link here');
		expect(result).toEqual([{ type: 'text', value: 'hello world, nothing to link here' }]);
	});

	it('detects a bare localhost:port link', async () => {
		const split = await loadSplitter();
		const result = split('visit localhost:7300 now');
		expect(result).toEqual([
			{ type: 'text', value: 'visit ' },
			{ type: 'link', value: 'localhost:7300' },
			{ type: 'text', value: ' now' },
		]);
	});

	it('detects an http://localhost link with path', async () => {
		const split = await loadSplitter();
		const result = split('see http://localhost:5173/drafts');
		expect(result).toEqual([
			{ type: 'text', value: 'see ' },
			{ type: 'link', value: 'http://localhost:5173/drafts' },
		]);
	});

	it('detects 127.0.0.1 variant', async () => {
		const split = await loadSplitter();
		const result = split('open 127.0.0.1:3000');
		expect(result).toEqual([
			{ type: 'text', value: 'open ' },
			{ type: 'link', value: '127.0.0.1:3000' },
		]);
	});

	it('detects multiple links in one message', async () => {
		const split = await loadSplitter();
		const result = split('a localhost:3000 and localhost:3001 here');
		const links = result.filter((s) => s.type === 'link');
		expect(links.map((s) => s.value)).toEqual(['localhost:3000', 'localhost:3001']);
	});

	it('does not match localhost without a port', async () => {
		const split = await loadSplitter();
		const result = split('just localhost here');
		expect(result.every((s) => s.type === 'text')).toBe(true);
	});

	it('does not match a remote URL', async () => {
		const split = await loadSplitter();
		const result = split('check https://example.com/page');
		expect(result.every((s) => s.type === 'text')).toBe(true);
	});

	it('handles leading link with no surrounding text', async () => {
		const split = await loadSplitter();
		const result = split('localhost:8080');
		expect(result).toEqual([{ type: 'link', value: 'localhost:8080' }]);
	});

	it('stops at CJK punctuation (does not swallow trailing fullwidth chars)', async () => {
		const split = await loadSplitter();
		const result = split('预览在 localhost:7300，点击查看。');
		const linkSeg = result.find((s) => s.type === 'link');
		expect(linkSeg?.value).toBe('localhost:7300');
	});
});
