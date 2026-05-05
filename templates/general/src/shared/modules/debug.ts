export interface DebugMethods {
	"debug.subscriptions": {
		params: {};
		result: {
			subscriptions: Array<{ id: string; eventType: string; filter: Record<string, unknown> }>;
		};
	};
}
