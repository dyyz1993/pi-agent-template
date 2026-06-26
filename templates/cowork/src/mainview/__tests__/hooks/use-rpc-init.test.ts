import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockInitializeConnection = vi.fn();
const mockAddLog = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockCall = vi.fn();

const mockChatSetMessages = vi.fn();
const mockChatSetState = vi.fn();

let mockConnectionState: Record<string, unknown>;
let mockLogState: Record<string, unknown>;
let mockChatState: Record<string, unknown>;

function resetMockConnectionState(overrides?: Partial<Record<string, unknown>>) {
	mockConnectionState = {
		ready: false,
		initializeConnection: mockInitializeConnection,
		...overrides,
	};
}

function resetMockLogState(overrides?: Partial<Record<string, unknown>>) {
	mockLogState = {
		addLog: mockAddLog,
		...overrides,
	};
}

function resetMockChatState(overrides?: Partial<Record<string, unknown>>) {
	mockChatState = {
		setMessages: mockChatSetMessages,
		messages: [],
		...overrides,
	};
}

vi.mock('../../stores/use-connection-store', () => {
	return {
		useConnectionStore: Object.assign(
			(selector: (s: Record<string, unknown>) => unknown) => selector(mockConnectionState),
			{
				getState: () => mockConnectionState,
				setState: (
					partial:
						| Partial<Record<string, unknown>>
						| ((prev: Record<string, unknown>) => Partial<Record<string, unknown>>),
				) => {
					const next = typeof partial === 'function' ? partial(mockConnectionState) : partial;
					mockConnectionState = { ...mockConnectionState, ...next };
				},
			},
		),
	};
});

vi.mock('../../stores/use-log-store', () => {
	return {
		useLogStore: Object.assign(
			(selector: (s: Record<string, unknown>) => unknown) => selector(mockLogState),
			{
				getState: () => mockLogState,
				setState: (
					partial:
						| Partial<Record<string, unknown>>
						| ((prev: Record<string, unknown>) => Partial<Record<string, unknown>>),
				) => {
					const next = typeof partial === 'function' ? partial(mockLogState) : partial;
					mockLogState = { ...mockLogState, ...next };
				},
			},
		),
	};
});

vi.mock('../../stores/use-chat-store', () => ({
	useChatStore: Object.assign(
		(selector: (s: Record<string, unknown>) => unknown) => selector(mockChatState),
		{
			getState: () => mockChatState,
			setState: mockChatSetState,
		},
	),
}));

vi.mock('../../lib/api-client', () => ({
	apiClient: {
		subscribe: mockSubscribe,
		unsubscribe: mockUnsubscribe,
		call: mockCall,
	},
}));

describe('useRpcInit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSubscribe.mockResolvedValue('sub-1');
		mockCall.mockResolvedValue({ messages: [] });
		resetMockLogState();
		resetMockChatState();
	});

	it('should call initializeConnection on mount', async () => {
		resetMockConnectionState({ ready: false });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());
		expect(mockInitializeConnection).toHaveBeenCalledTimes(1);
	});

	it('should not subscribe when not ready', async () => {
		resetMockConnectionState({ ready: false });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());
		expect(mockSubscribe).not.toHaveBeenCalled();
		expect(mockCall).not.toHaveBeenCalled();
	});

	it('should subscribe and load history when ready', async () => {
		resetMockConnectionState({ ready: true });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());

		await waitFor(() => {
			expect(mockSubscribe).toHaveBeenCalledWith('chat.message', expect.any(Function), {});
		});

		await waitFor(() => {
			expect(mockCall).toHaveBeenCalledWith('chat.list', { limit: 100 });
		});
	});

	it('should load history messages into chat store', async () => {
		const messages = [
			{ id: '1', role: 'user' as const, content: 'hello', timestamp: 1000 },
			{ id: '2', role: 'assistant' as const, content: 'world', timestamp: 2000 },
		];
		mockCall.mockResolvedValue({ messages });

		resetMockConnectionState({ ready: true });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());

		await waitFor(() => {
			expect(mockChatSetMessages).toHaveBeenCalled();
		});

		expect(mockAddLog).toHaveBeenCalledWith('Loaded 2 history messages');
	});

	it('should unsubscribe on cleanup when ready', async () => {
		resetMockConnectionState({ ready: true });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		const { unmount } = renderHook(() => useRpcInit());

		await waitFor(() => {
			expect(mockSubscribe).toHaveBeenCalled();
		});

		unmount();
		expect(mockUnsubscribe).toHaveBeenCalledWith('sub-1');
	});

	it('should handle history load failure gracefully', async () => {
		mockCall.mockRejectedValue(new Error('Network error'));
		resetMockConnectionState({ ready: true });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());

		await waitFor(() => {
			expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('Failed to load history'));
		});
	});

	it('should forward chat.message payloads to chat store via setState', async () => {
		let subscriptionHandler: ((payload: Record<string, unknown>) => void) | undefined;
		mockSubscribe.mockImplementation(
			async (_event: string, handler: (p: Record<string, unknown>) => void) => {
				subscriptionHandler = handler;
				return 'sub-1';
			},
		);

		resetMockConnectionState({ ready: true });
		const { useRpcInit } = await import('../../hooks/use-rpc-init');
		renderHook(() => useRpcInit());

		await waitFor(() => {
			expect(mockSubscribe).toHaveBeenCalled();
		});

		subscriptionHandler!({
			id: 'msg-1',
			role: 'assistant',
			content: 'test message',
			timestamp: 12345,
		});

		expect(mockChatSetState).toHaveBeenCalled();
	});
});
