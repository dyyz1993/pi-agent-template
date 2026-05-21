import { useState, useCallback, useRef, useEffect } from "react";
import {
	Search,
	CaseSensitive,
	WholeWord,
	Regex,
	FileText,
	ChevronRight,
	ChevronDown,
	Loader2,
	X,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { useTranslation } from "react-i18next";
import type { TreeNode } from "../../types";

interface SearchMatch {
	file: string;
	line: number;
	column: number;
	text: string;
	highlightStart: number;
	highlightEnd: number;
}

interface FileGroup {
	filePath: string;
	relativePath: string;
	matches: SearchMatch[];
	expanded: boolean;
}

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".next",
	".nuxt",
	"coverage",
	".cache",
	".turbo",
	".vercel",
	"out",
	".output",
]);

const TEXT_EXTENSIONS = new Set([
	"ts",
	"tsx",
	"js",
	"jsx",
	"mjs",
	"cjs",
	"json",
	"md",
	"mdx",
	"yaml",
	"yml",
	"toml",
	"css",
	"scss",
	"less",
	"sass",
	"html",
	"htm",
	"xml",
	"svg",
	"py",
	"rb",
	"go",
	"rs",
	"java",
	"kt",
	"swift",
	"c",
	"cpp",
	"h",
	"hpp",
	"sh",
	"bash",
	"zsh",
	"fish",
	"sql",
	"graphql",
	"gql",
	"txt",
	"csv",
	"env",
	"gitignore",
	"eslintrc",
	"prettierrc",
	"conf",
	"ini",
	"cfg",
	"log",
	"vue",
	"svelte",
]);

function isTextFile(name: string): boolean {
	const dotIdx = name.lastIndexOf(".");
	if (dotIdx === -1) return false;
	const ext = name.slice(dotIdx + 1).toLowerCase();
	if (TEXT_EXTENSIONS.has(ext)) return true;
	if (name.startsWith(".") && TEXT_EXTENSIONS.has(name.slice(1))) return true;
	return false;
}

function buildSearchRegex(
	query: string,
	caseSensitive: boolean,
	wholeWord: boolean,
	useRegex: boolean
): RegExp {
	let pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	if (wholeWord) pattern = `\\b${pattern}\\b`;
	return new RegExp(pattern, caseSensitive ? "g" : "gi");
}

export function SearchPanel() {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [caseSensitive, setCaseSensitive] = useState(false);
	const [wholeWord, setWholeWord] = useState(false);
	const [useRegex, setUseRegex] = useState(false);
	const [results, setResults] = useState<FileGroup[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [totalMatches, setTotalMatches] = useState(0);
	const [filesSearched, setFilesSearched] = useState(0);
	const [hasSearched, setHasSearched] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const abortRef = useRef(false);

	const currentPath = useExplorerStore((s) => s.currentPath);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const collectFiles = useCallback(async (dirPath: string): Promise<string[]> => {
		const files: string[] = [];
		const queue = [dirPath];

		while (queue.length > 0 && !abortRef.current) {
			const current = queue.shift()!;
			try {
				const res = await apiClient.call("file.listDir", { path: current });
				for (const entry of res.entries) {
					if (abortRef.current) break;
					if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".env.local")
						continue;
					if (entry.type === "directory") {
						if (!SKIP_DIRS.has(entry.name)) queue.push(entry.path);
					} else if (isTextFile(entry.name)) {
						files.push(entry.path);
					}
				}
			} catch {
				// skip unreadable dirs
			}
		}
		return files;
	}, []);

	const performSearch = useCallback(async () => {
		if (!query.trim() || !currentPath) return;

		abortRef.current = false;
		setIsSearching(true);
		setHasSearched(true);
		setResults([]);
		setTotalMatches(0);

		try {
			const regex = buildSearchRegex(query.trim(), caseSensitive, wholeWord, useRegex);
			const filePaths = await collectFiles(currentPath);
			const matchMap = new Map<string, SearchMatch[]>();
			let matchCount = 0;

			for (const fp of filePaths) {
				if (abortRef.current) break;
				try {
					const res = await apiClient.call("file.readFile", { path: fp });
					const lines = res.content.split("\n");
					for (let i = 0; i < lines.length; i++) {
						const line = lines[i]!;
						regex.lastIndex = 0;
						const m = regex.exec(line);
						if (m) {
							if (!matchMap.has(fp)) matchMap.set(fp, []);
							matchMap.get(fp)!.push({
								file: fp,
								line: i + 1,
								column: m.index + 1,
								text: line!,
								highlightStart: m.index,
								highlightEnd: m.index + m[0]!.length,
							});
							matchCount++;
						}
					}
				} catch {
					// skip unreadable files
				}
			}

			setFilesSearched(filePaths.length);

			const rootPath = currentPath.endsWith("/") ? currentPath : currentPath + "/";
			const groups: FileGroup[] = [];
			for (const [filePath, matches] of matchMap) {
				groups.push({
					filePath,
					relativePath: filePath.startsWith(rootPath) ? filePath.slice(rootPath.length) : filePath,
					matches,
					expanded: true,
				});
			}

			setResults(groups);
			setTotalMatches(matchCount);
		} catch {
			// search error
		} finally {
			setIsSearching(false);
		}
	}, [query, caseSensitive, wholeWord, useRegex, currentPath, collectFiles]);

	const cancelSearch = useCallback(() => {
		abortRef.current = true;
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !isSearching) {
				performSearch();
			}
			if (e.key === "Escape") {
				setQuery("");
				inputRef.current?.focus();
			}
		},
		[performSearch, isSearching]
	);

	const toggleGroup = useCallback((index: number) => {
		setResults((prev) => prev.map((g, i) => (i === index ? { ...g, expanded: !g.expanded } : g)));
	}, []);

	const handleOpenFile = useCallback((filePath: string, line: number) => {
		const node: TreeNode = {
			name: filePath.split("/").pop() || filePath,
			path: filePath,
			type: "file",
		};
		useExplorerStore.getState().openFileAtLine(node, line);
	}, []);

	const modKey =
		typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

	return (
		<div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
			{/* Header */}
			<div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide border-b border-[var(--color-border-primary)] flex items-center justify-between flex-shrink-0">
				<div className="flex items-center gap-1.5">
					<Search className="w-3.5 h-3.5" />
					{t("sidebar.search")}
				</div>
				<kbd className="px-1.5 py-0.5 text-[10px] text-[var(--color-text-placeholder)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded font-mono">
					{modKey}⇧F
				</kbd>
			</div>

			{/* Search input */}
			<div className="p-2 border-b border-[var(--color-border-primary)] flex-shrink-0">
				<div className="relative">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-placeholder)]" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t("sidebar.search") + "..."}
						className="w-full pl-7 pr-7 py-1.5 text-xs bg-[var(--color-bg-secondary)] rounded text-[var(--color-text-primary)] border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
					/>
					{query && (
						<button
							onClick={() => {
								setQuery("");
								inputRef.current?.focus();
							}}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]"
						>
							<X className="w-3 h-3" />
						</button>
					)}
				</div>

				{/* Toggle buttons */}
				<div className="flex items-center gap-0.5 mt-1.5">
					<button
						onClick={() => setCaseSensitive((v) => !v)}
						className={`p-1 rounded text-xs transition-colors ${
							caseSensitive
								? "bg-[var(--color-accent)]/30 text-[var(--color-text-accent)] border border-[var(--color-accent)]/50"
								: "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] border border-transparent"
						}`}
						title="Match Case"
					>
						<CaseSensitive className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => setWholeWord((v) => !v)}
						className={`p-1 rounded text-xs transition-colors ${
							wholeWord
								? "bg-[var(--color-accent)]/30 text-[var(--color-text-accent)] border border-[var(--color-accent)]/50"
								: "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] border border-transparent"
						}`}
						title="Match Whole Word"
					>
						<WholeWord className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => setUseRegex((v) => !v)}
						className={`p-1 rounded text-xs transition-colors ${
							useRegex
								? "bg-[var(--color-accent)]/30 text-[var(--color-text-accent)] border border-[var(--color-accent)]/50"
								: "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] border border-transparent"
						}`}
						title="Use Regular Expression"
					>
						<Regex className="w-3.5 h-3.5" />
					</button>

					<div className="flex-1" />

					{isSearching ? (
						<button
							onClick={cancelSearch}
							className="px-2 py-1 text-xs text-[var(--color-text-error)] hover:text-[var(--color-text-error)] transition-colors flex items-center gap-1"
						>
							<Loader2 className="w-3 h-3 animate-spin" />
							{t("common.cancel")}
						</button>
					) : (
						query.trim() && (
							<button
								onClick={performSearch}
								className="px-2 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors"
							>
								{t("sidebar.search")}
							</button>
						)
					)}
				</div>
			</div>

			{/* Results header */}
			{hasSearched && !isSearching && (
				<div className="px-3 py-1.5 text-[11px] text-[var(--color-text-placeholder)] border-b border-[var(--color-bg-secondary)] flex-shrink-0">
					{totalMatches > 0 ? (
						<>
							{t("search.resultsIn", { count: totalMatches, fileCount: results.length })}
							<span className="ml-2">{t("search.filesSearched", { count: filesSearched })}</span>
						</>
					) : (
						t("search.noResults")
					)}
				</div>
			)}

			{/* Loading state */}
			{isSearching && (
				<div className="flex items-center justify-center py-8 text-[var(--color-text-placeholder)] text-sm flex-shrink-0">
					<Loader2 className="w-4 h-4 animate-spin mr-2" />
					{t("common.loading")}
				</div>
			)}

			{/* Results list */}
			<div className="flex-1 overflow-y-auto">
				{!hasSearched && !isSearching ? (
					<div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] text-xs px-4">
						<Search className="w-8 h-8 mb-2 text-[var(--color-text-placeholder)]" />
						<p>{t("search.typeToSearch")}</p>
						<p className="mt-1 text-[var(--color-text-placeholder)]">
							{t("search.focusShortcut", { key: modKey })}
						</p>
					</div>
				) : !isSearching && totalMatches === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] text-xs px-4">
						<FileText className="w-8 h-8 mb-2 text-[var(--color-text-placeholder)]" />
						<p>{t("search.noResultsFor", { query })}</p>
						<p className="mt-1 text-[var(--color-text-placeholder)]">{t("search.tryDifferent")}</p>
					</div>
				) : !isSearching && totalMatches === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] text-xs px-4">
						<FileText className="w-8 h-8 mb-2 text-[var(--color-text-placeholder)]" />
						<p>No results for "{query}"</p>
						<p className="mt-1 text-[var(--color-text-placeholder)]">Try different search terms</p>
					</div>
				) : (
					<div className="py-1">
						{results.map((group, gi) => (
							<div key={group.filePath}>
								{/* File group header */}
								<button
									onClick={() => toggleGroup(gi)}
									className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
								>
									{group.expanded ? (
										<ChevronDown className="w-3 h-3 text-[var(--color-text-placeholder)] flex-shrink-0" />
									) : (
										<ChevronRight className="w-3 h-3 text-[var(--color-text-placeholder)] flex-shrink-0" />
									)}
									<FileText className="w-3.5 h-3.5 text-[var(--color-text-placeholder)] flex-shrink-0" />
									<span className="text-[var(--color-text-secondary)] truncate flex-1">
										{group.relativePath}
									</span>
									<span className="text-[10px] text-[var(--color-text-tertiary)] flex-shrink-0 ml-1">
										{group.matches.length}
									</span>
								</button>

								{/* Individual matches */}
								{group.expanded && (
									<div className="ml-4">
										{group.matches.map((match, mi) => (
											<button
												key={mi}
												onClick={() => handleOpenFile(match.file, match.line)}
												className="w-full text-left px-2 py-0.5 text-[11px] hover:bg-[var(--color-bg-secondary)] transition-colors group flex items-start gap-2"
											>
												<span className="text-[var(--color-text-tertiary)] w-6 text-right flex-shrink-0 select-none pt-px">
													{match.line}
												</span>
												<span className="text-[var(--color-text-tertiary)] truncate font-mono leading-relaxed">
													{match.text.slice(0, match.highlightStart)}
													<span className="bg-[var(--color-accent)]/40 text-[var(--color-text-accent)]">
														{match.text.slice(match.highlightStart, match.highlightEnd)}
													</span>
													{match.text.slice(match.highlightEnd)}
												</span>
											</button>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
