import type { RPCServer } from '@dyyz1993/rpc-core';
import type { MethodParams, MethodResult } from '@dyyz1993/rpc-core';
import type { RPCMethods, HandlerOptions } from '../rpc-schema';

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r('debug.subscriptions', async () => {
		return {
			subscriptions: (
				server as unknown as { getActiveSubscriptions(): unknown }
			).getActiveSubscriptions(),
		};
	});
}
