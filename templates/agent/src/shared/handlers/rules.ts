import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { Rule } from "../modules/rules";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

const rules: Rule[] = [];
let ruleIdCounter = 1;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("rules.list", async () => ({ rules }));

  r("rules.add", async (params) => {
    const rule: Rule = {
      id: `rule-${ruleIdCounter++}`,
      name: params.name,
      pattern: params.pattern,
      enabled: true,
    };
    rules.push(rule);
    return { rule };
  });

  r("rules.toggle", async (params) => {
    const rule = rules.find((r) => r.id === params.id);
    if (!rule) throw new Error(`Rule ${params.id} not found`);
    rule.enabled = !rule.enabled;
    return { rule };
  });

  r("rules.remove", async (params) => {
    const idx = rules.findIndex((r) => r.id === params.id);
    if (idx === -1) return { success: false };
    rules.splice(idx, 1);
    return { success: true };
  });
}
