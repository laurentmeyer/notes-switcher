import type { TFile, WorkspaceLeaf } from "obsidian";

export type SwitchMode = "tabs" | "recent-files";

export interface Settings {
    viewTypes: string[];
    showModal: boolean;
    skipPinned: boolean;
    stayInSplit: boolean;
    focusLeafOnKeyUp: boolean;
    useViewTypes: boolean;
    switchMode: SwitchMode;
}

export const DEFAULT_SETTINGS: Settings = {
    viewTypes: ["markdown", "canvas", "pdf"],
    showModal: true,
    skipPinned: false,
    stayInSplit: true,
    focusLeafOnKeyUp: false, // opt-in for existing users
    useViewTypes: true,
    switchMode: "tabs",
};

export const NEW_USER_SETTINGS: Partial<Settings> = {
    focusLeafOnKeyUp: true, // default for new users
    useViewTypes: false,
};

export type SwitchItem =
    | { type: "leaf"; leaf: WorkspaceLeaf }
    | { type: "recent-file"; file: TFile };

declare module "obsidian" {
    interface App {
        hotkeyManager: {
            bakedIds: string[];
            bakedHotkeys: { modifiers: string; key: string }[];
        };
    }

    interface WorkspaceLeaf {
        activeTime: number;
    }

    interface WorkspaceItem {
        openLeaf(leaf: WorkspaceLeaf): void;
    }

    interface Modal {
        chooser: {
            moveDown: any;
            moveUp: any;
            selectedItem: number;
            setSelectedItem: (index: number) => void;
        };
        dimBackground: boolean;
    }
}
