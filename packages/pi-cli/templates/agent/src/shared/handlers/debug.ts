import type { RPCServer } from "@dyyz1993/rpc-core";
import type { HandlerOptions } from "../rpc-schema";

export function register(server: RPCServer, _options: HandlerOptions): void {
	server.register("debug.subscriptions", async () => {
		return {
			subscriptions: (
				server as unknown as { getActiveSubscriptions(): unknown }
			).getActiveSubscriptions(),
		};
	});
}
