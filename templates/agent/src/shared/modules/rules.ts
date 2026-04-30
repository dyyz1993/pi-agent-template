export interface Rule {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
}

export interface RulesMethods {
  "rules.list": {
    params: {};
    result: { rules: Rule[] };
  };
  "rules.add": {
    params: { name: string; pattern: string };
    result: { rule: Rule };
  };
  "rules.toggle": {
    params: { id: string };
    result: { rule: Rule };
  };
  "rules.remove": {
    params: { id: string };
    result: { success: boolean };
  };
}
