/**
 * RPC 初始化 Hook — 建立连接 + 加载初始数据
 */
import { useEffect } from "react";
import { useConnectionStore } from "../stores/use-connection-store";
import { useTaskStore } from "../stores/use-task-store";
import { useContextStore } from "../stores/use-context-store";
import { useOutputStore } from "../stores/use-output-store";

export function useRpcInit() {
	const ready = useConnectionStore((s) => s.ready);
	const initializeConnection = useConnectionStore((s) => s.initializeConnection);

	// 初始化连接
	useEffect(() => {
		initializeConnection();
	}, [initializeConnection]);

	// 连接就绪后加载数据
	useEffect(() => {
		if (!ready) return;
		useTaskStore.getState().fetchTasks();
		useContextStore.getState().fetchAll();
		useOutputStore.getState().fetchOutputs();
	}, [ready]);
}
