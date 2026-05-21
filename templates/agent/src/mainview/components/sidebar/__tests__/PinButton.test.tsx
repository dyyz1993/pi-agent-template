import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

const mockSetPinned = vi.fn();

vi.mock('../../../stores/use-sidebar-store', () => ({
	useSidebarStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({ isPinned: true, setPinned: mockSetPinned, breakpoint: 'desktop' }),
}));

describe('PinButton', () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('should render a button', async () => {
		const { PinButton } = await import('../PinButton');
		render(<PinButton />);
		expect(screen.getByRole('button')).toBeDefined();
	});

	it('should show unpin title when pinned', async () => {
		const { PinButton } = await import('../PinButton');
		render(<PinButton />);
		expect(screen.getByTitle('Unpin sidebar')).toBeDefined();
	});

	it('should call setPinned on click', async () => {
		const { PinButton } = await import('../PinButton');
		render(<PinButton />);
		fireEvent.click(screen.getByRole('button'));
		expect(mockSetPinned).toHaveBeenCalledWith(false);
	});

	it('should not render on mobile', async () => {
		vi.resetModules();
		vi.doMock('../../../stores/use-sidebar-store', () => ({
			useSidebarStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
				selector({ isPinned: false, setPinned: vi.fn(), breakpoint: 'mobile' }),
		}));
		const mod = await import('../PinButton');
		const { container } = render(<mod.PinButton />);
		expect(container.innerHTML).toBe('');
		vi.resetModules();
	});
});
