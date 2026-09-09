/**
 * Network Panel state — shared open/close state between TopBar button
 * and the AppLayout drawer.
 */

import { create } from "zustand";

interface NetworkPanelState {
	open: boolean;
	toggle: () => void;
	setOpen: (open: boolean) => void;
}

export const useNetworkPanelStore = create<NetworkPanelState>((set, get) => ({
	open: false,
	toggle: () => set({ open: !get().open }),
	setOpen: (open) => set({ open }),
}));
