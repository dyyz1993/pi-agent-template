export interface CommandPolicy {
	enabled: boolean;
	blockedPatterns: RegExp[];
	allowedCommands: string[] | null;
}

let policy: CommandPolicy = {
	enabled: true,
	blockedPatterns: [
		/rm\s+-rf\s+(.*\s)?\/($|\s)/,
		/rm\s+-rf\s+--no-preserve-root/,
		/mkfs/,
		/dd\s+if=/,
		/>\s*\/dev\//,
		/:()\s*\{.*\|.*&\s*\}/,
		/shutdown/,
		/reboot/,
	],
	allowedCommands: null,
};

export function setCommandPolicy(p: CommandPolicy): void {
	policy = p;
}

export function isCommandAllowed(command: string): boolean {
	if (!policy.enabled) return false;

	const trimmed = command.trim();
	if (!trimmed) return false;

	for (const pattern of policy.blockedPatterns) {
		if (pattern.test(trimmed)) return false;
	}

	if (policy.allowedCommands) {
		const baseCommand = trimmed.split(/\s+/)[0]!;
		return policy.allowedCommands.some(
			(allowed) => baseCommand === allowed || baseCommand.startsWith(allowed)
		);
	}

	return true;
}

export function validateCommand(command: string): string {
	if (!policy.enabled) {
		throw new Error("Bash execution is disabled");
	}

	const trimmed = command.trim();
	if (!trimmed) {
		throw new Error("Command cannot be empty");
	}

	if (!isCommandAllowed(trimmed)) {
		if (policy.allowedCommands) {
			throw new Error(`Command not in whitelist: "${trimmed}"`);
		}
		throw new Error(`Command blocked for safety: "${trimmed}"`);
	}

	return trimmed;
}
