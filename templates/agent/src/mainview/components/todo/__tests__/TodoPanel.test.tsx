import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

const mockAddItem = vi.fn();
const mockUpdateItem = vi.fn();
const mockRemoveItem = vi.fn();
const mockFetchItems = vi.fn();

vi.mock('../../../stores/use-todo-store', () => ({
	useTodoStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({
			items: [
				{ id: '1', content: 'Buy milk', status: 'pending' },
				{ id: '2', content: 'Write code', status: 'completed' },
			],
			fetchItems: mockFetchItems,
			addItem: mockAddItem,
			updateItem: mockUpdateItem,
			removeItem: mockRemoveItem,
		}),
}));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

describe('TodoPanel', () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('should render todo title', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		expect(screen.getByText('todo.title')).toBeDefined();
	});

	it('should render add button', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		expect(screen.getByText('todo.add')).toBeDefined();
	});

	it('should display todo items', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		expect(screen.getByText('Buy milk')).toBeDefined();
		expect(screen.getByText('Write code')).toBeDefined();
	});

	it('should call fetchItems on mount', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		expect(mockFetchItems).toHaveBeenCalled();
	});

	it('should show input when add button is clicked', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		fireEvent.click(screen.getByText('todo.add'));
		expect(screen.getByPlaceholderText('todo.placeholder')).toBeDefined();
	});

	it('should call addItem on input submit', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		fireEvent.click(screen.getByText('todo.add'));
		const input = screen.getByPlaceholderText('todo.placeholder');
		fireEvent.change(input, { target: { value: 'New task' } });
		fireEvent.click(screen.getByText('todo.save'));
		expect(mockAddItem).toHaveBeenCalledWith('New task');
	});

	it('should hide input on Escape', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		render(<TodoPanel />);
		fireEvent.click(screen.getByText('todo.add'));
		const input = screen.getByPlaceholderText('todo.placeholder');
		fireEvent.keyDown(input, { key: 'Escape' });
		expect(screen.queryByPlaceholderText('todo.placeholder')).toBeNull();
	});

	it('should render status indicators for each item', async () => {
		const { TodoPanel } = await import('../TodoPanel');
		const _container = render(<TodoPanel />);
		const statusTexts = screen.getAllByText('todo.status');
		expect(statusTexts.length).toBeGreaterThan(0);
	});
});
