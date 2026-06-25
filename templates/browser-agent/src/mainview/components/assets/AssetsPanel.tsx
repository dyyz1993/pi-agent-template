/**
 * 资源面板 — 右侧资源展示
 *
 * 对应 PRD §4.6 资源管理 + §5.2 资源面板职责
 */

import { useAssetStore } from "../../stores/use-asset-store";
import { useSessionStore } from "../../stores/use-session-store";

export function AssetsPanel() {
	const currentSession = useSessionStore((s) => s.currentSession);
	const assets = currentSession?.assets || [];
	const downloadAsset = useAssetStore((s) => s.downloadAsset);
	const getDownloadUrl = useAssetStore((s) => s.getDownloadUrl);

	const screenshots = assets.filter((a) => a.kind === "screenshot");
	const images = assets.filter((a) => a.kind === "image");
	const files = assets.filter((a) =>
		["csv", "json", "report"].includes(a.kind),
	);
	const zips = assets.filter((a) => a.kind === "zip");

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-2 border-b border-[var(--color-border-primary)]">
				<h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
					资源
				</h3>
				<div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
					总计 {assets.length} 个资源
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-4">
				{/* 截图 */}
				{screenshots.length > 0 && (
					<div>
						<h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
							截图
						</h4>
						<div className="grid grid-cols-1 gap-2">
							{screenshots.map((s) => (
								<img
									key={s.id}
									src={getDownloadUrl(s)}
									alt={s.name}
									className="rounded-lg border border-[var(--color-border-primary)] cursor-pointer hover:opacity-90 transition-opacity"
									onClick={() => downloadAsset(s.id)}
								/>
							))}
						</div>
					</div>
				)}

				{/* 图片网格 */}
				{images.length > 0 && (
					<div>
						<h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
							图片
						</h4>
						<div className="grid grid-cols-3 gap-1">
							{images.slice(0, 9).map((img) => (
								<img
									key={img.id}
									src={getDownloadUrl(img)}
									alt={img.name}
									className="rounded aspect-square object-cover border border-[var(--color-border-primary)] cursor-pointer hover:opacity-90"
									onClick={() => downloadAsset(img.id)}
								/>
							))}
							{images.length > 9 && (
								<div className="rounded aspect-square bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xs text-[var(--color-text-tertiary)]">
									+{images.length - 9}
								</div>
							)}
						</div>
					</div>
				)}

				{/* 文件列表 */}
				{files.length > 0 && (
					<div>
						<h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
							文件
						</h4>
						<div className="space-y-1">
							{files.map((f) => (
								<button
									key={f.id}
									onClick={() => downloadAsset(f.id)}
									className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-hover)] text-left text-sm"
								>
									<span className="text-xs">
										{f.kind === "csv"
											? "📊"
											: f.kind === "json"
												? "📋"
												: "📄"}
									</span>
									<span className="flex-1 truncate text-xs">
										{f.name}
									</span>
									<span className="text-xs text-[var(--color-text-tertiary)]">
										{f.size
											? f.size > 1024 * 1024
												? `${(f.size / 1024 / 1024).toFixed(1)} MB`
												: `${Math.round(f.size / 1024)} KB`
											: ""}
									</span>
								</button>
							))}
						</div>
					</div>
				)}

				{/* ZIP 打包 */}
				{zips.length > 0 && (
					<div>
						{zips.map((z) => (
							<button
								key={z.id}
								onClick={() => downloadAsset(z.id)}
								className="w-full py-2 px-3 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
							>
								📦 下载全部 (ZIP)
							</button>
						))}
					</div>
				)}

				{assets.length === 0 && (
					<div className="text-xs text-[var(--color-text-tertiary)] text-center py-8">
						暂无资源
					</div>
				)}
			</div>
		</div>
	);
}
