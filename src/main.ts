import { Platform, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { GeneralModal } from "./modal";
import CTPSettingTab from "./settingsTab";
import {
    DEFAULT_SETTINGS,
    NEW_USER_SETTINGS,
    Settings,
    SwitchItem,
} from "./types";

export default class CycleThroughPanes extends Plugin {
    settings: Settings;
    ctrlPressedTimestamp = 0;
    ctrlKeyCode: string | undefined;
    queuedSwitchItem: SwitchItem | undefined;
    currentIndex = 0;
    modal: GeneralModal | undefined;
    switchItems: SwitchItem[] | undefined;
    recentFilePaths: string[] = [];

    keyDownFunc = this.onKeyDown.bind(this);
    keyUpFunc = this.onKeyUp.bind(this);

    getLeavesOfTypes(types: string[]): WorkspaceLeaf[] {
        const leaves: WorkspaceLeaf[] = [];
        const activeLeaf = this.app.workspace.activeLeaf;
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (this.settings.skipPinned && leaf.getViewState().pinned) return;

            const correctViewType =
                !this.settings.useViewTypes ||
                types.contains(leaf.view.getViewType());

            if (!correctViewType) return;

            const isMainWindow = leaf.view.containerEl.win == window;
            const sameWindow = leaf.view.containerEl.win == activeWindow;

            let correctPane = false;
            if (isMainWindow) {
                if (this.settings.stayInSplit) {
                    correctPane =
                        sameWindow && leaf.getRoot() == activeLeaf.getRoot();
                } else {
                    correctPane =
                        sameWindow &&
                        leaf.getRoot() == this.app.workspace.rootSplit;
                }
            } else {
                correctPane = sameWindow;
            }
            if (correctPane) {
                leaves.push(leaf);
            }
        });

        return leaves;
    }

    async onload() {
        console.log("loading plugin: Cycle through panes");

        await this.loadSettings();

        const lastOpen =
            (this.app.workspace as any).getLastOpenFiles?.() ?? [];
        if (Array.isArray(lastOpen)) {
            this.recentFilePaths = lastOpen;
        }

        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                if (file) {
                    this.touchRecentFile(file.path);
                }
            })
        );

        this.addSettingTab(new CTPSettingTab(this, this.settings));

        this.addCommand({
            id: "cycle-through-panes",
            name: "Go to right tab",
            checkCallback: (checking: boolean) => {
                const active = this.app.workspace.activeLeaf;

                if (active) {
                    if (!checking) {
                        const leaves: WorkspaceLeaf[] = this.getLeavesOfTypes(
                            this.settings.viewTypes
                        );
                        const index = leaves.indexOf(active);

                        if (index === leaves.length - 1) {
                            this.queueFocusLeaf(leaves[0]);
                        } else {
                            this.queueFocusLeaf(leaves[index + 1]);
                        }
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "cycle-through-panes-reverse",
            name: "Go to left tab",
            checkCallback: (checking: boolean) => {
                const active = this.app.workspace.activeLeaf;
                if (active) {
                    if (!checking) {
                        const leaves: WorkspaceLeaf[] = this.getLeavesOfTypes(
                            this.settings.viewTypes
                        );
                        const index = leaves.indexOf(active);

                        if (index !== undefined) {
                            if (index === 0) {
                                this.queueFocusLeaf(leaves[leaves.length - 1]);
                            } else {
                                this.queueFocusLeaf(leaves[index - 1]);
                            }
                        }
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "cycle-through-panes-add-view",
            name: "Enable this View Type",
            checkCallback: (checking: boolean) => {
                const active = this.app.workspace.activeLeaf;
                if (
                    active &&
                    !this.settings.viewTypes.contains(active.view.getViewType())
                ) {
                    if (!checking) {
                        this.settings.viewTypes.push(active.view.getViewType());
                        this.saveSettings();
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "cycle-through-panes-remove-view",
            name: "Disable this View Type",
            checkCallback: (checking: boolean) => {
                const active = this.app.workspace.activeLeaf;
                if (
                    active &&
                    this.settings.viewTypes.contains(active.view.getViewType())
                ) {
                    if (!checking) {
                        this.settings.viewTypes.remove(
                            active.view.getViewType()
                        );
                        this.saveSettings();
                    }
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: "focus-left-sidebar",
            name: "Focus on left sidebar",
            callback: () => {
                app.workspace.leftSplit.expand();
                let leaf: WorkspaceLeaf;
                app.workspace.iterateAllLeaves((e) => {
                    if (e.getRoot() == app.workspace.leftSplit) {
                        if (e.activeTime > (leaf?.activeTime || 0)) {
                            leaf = e;
                        }
                    }
                });
                this.queueFocusLeaf(leaf);
            },
        });

        this.addCommand({
            id: "focus-right-sidebar",
            name: "Focus on right sidebar",
            callback: () => {
                app.workspace.rightSplit.expand();
                let leaf: WorkspaceLeaf;
                app.workspace.iterateAllLeaves((e) => {
                    if (e.getRoot() == app.workspace.rightSplit) {
                        if (e.activeTime > (leaf?.activeTime || 0)) {
                            leaf = e;
                        }
                    }
                });
                this.queueFocusLeaf(leaf);
            },
        });

        this.addCommand({
            id: "focus-on-last-active-pane",
            name: "Go to previous tab",
            callback: async () => {
                this.cycleSwitchItems(1);
            },
        });
        this.addCommand({
            id: "focus-on-last-active-pane-reverse",
            name: "Go to next tab",
            callback: async () => {
                this.cycleSwitchItems(-1);
            },
        });

        window.addEventListener("keydown", this.keyDownFunc);
        window.addEventListener("keyup", this.keyUpFunc);
    }

    queueFocusLeaf(leaf: WorkspaceLeaf) {
        if (!leaf) return;
        this.queueSwitchItem({ type: "leaf", leaf });
    }

    queueSwitchItem(item: SwitchItem | undefined) {
        this.queuedSwitchItem = undefined;

        if (!item) return;

        if (item.type === "leaf" && !this.settings.focusLeafOnKeyUp) {
            this.commitSwitchItem(item);
            return;
        }

        this.queuedSwitchItem = item;
    }

    commitSwitchItem(item: SwitchItem | undefined) {
        if (!item) return;

        if (item.type === "leaf") {
            this.focusLeaf(item.leaf);
            return;
        }

        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
            void leaf.openFile(item.file, { active: true });
            return;
        }

        void this.app.workspace.openLinkText(
            item.file.path,
            this.app.workspace.getActiveFile()?.path ?? "",
            false
        );
    }

    focusLeaf(leaf: WorkspaceLeaf) {
        if (leaf) {
            const root = leaf.getRoot();
            if (root != this.app.workspace.rootSplit && Platform.isMobile) {
                root.openLeaf(leaf);
                leaf.activeTime = Date.now();
            } else {
                this.app.workspace.setActiveLeaf(leaf, { focus: true });
            }
            if (leaf.getViewState().type == "search") {
                const search = leaf.view.containerEl.find(
                    ".search-input-container input"
                );

                search.focus();
            }
        }
    }

    cycleSwitchItems(direction: 1 | -1) {
        this.prepareSwitchItems();

        if (!this.switchItems?.length) {
            return;
        }

        const length = this.switchItems.length;
        this.currentIndex = (this.currentIndex + direction + length) % length;

        const item = this.switchItems[this.currentIndex];
        this.queueSwitchItem(item);
    }

    prepareSwitchItems() {
        if (this.switchItems) {
            return;
        }

        const items =
            this.settings.switchMode === "recent-files"
                ? this.buildRecentFileItems()
                : this.buildTabItems();

        if (!items.length) {
            this.switchItems = undefined;
            this.currentIndex = 0;
            return;
        }

        this.switchItems = items;
        this.currentIndex = this.findActiveIndex(items);
    }

    buildTabItems(): SwitchItem[] {
        const leaves = this.getLeavesOfTypes(this.settings.viewTypes);
        leaves.sort((a, b) => b.activeTime - a.activeTime);
        return leaves.map((leaf) => ({ type: "leaf", leaf }));
    }

    buildRecentFileItems(): SwitchItem[] {
        const orderedPaths: string[] = [];
        const seen = new Set<string>();

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && !seen.has(activeFile.path)) {
            orderedPaths.push(activeFile.path);
            seen.add(activeFile.path);
        }

        for (const path of this.recentFilePaths) {
            if (!seen.has(path)) {
                orderedPaths.push(path);
                seen.add(path);
            }
        }

        const items: SwitchItem[] = [];
        for (const path of orderedPaths) {
            const abstractFile = this.app.vault.getAbstractFileByPath(path);
            if (abstractFile instanceof TFile) {
                items.push({ type: "recent-file", file: abstractFile });
            }
        }

        return items;
    }

    findActiveIndex(items: SwitchItem[]): number {
        const activeLeaf = this.app.workspace.activeLeaf;
        const activeFile = this.app.workspace.getActiveFile();

        const index = items.findIndex((item) => {
            if (item.type === "leaf") {
                return item.leaf === activeLeaf;
            }
            if (item.type === "recent-file" && activeFile) {
                return item.file.path === activeFile.path;
            }
            return false;
        });

        return index >= 0 ? index : 0;
    }

    touchRecentFile(path: string) {
        this.recentFilePaths = [
            path,
            ...this.recentFilePaths.filter((existing) => existing !== path),
        ].slice(0, 50);
        if (this.settings.switchMode === "recent-files") {
            this.switchItems = undefined;
        }
    }

    getSwitchItemLabel(item: SwitchItem): string {
        if (item.type === "leaf") {
            return item.leaf.view.getDisplayText();
        }

        return item.file.path;
    }

    onKeyDown(e: KeyboardEvent) {
        if (e.key == "Control") {
            this.ctrlPressedTimestamp = e.timeStamp;
            this.ctrlKeyCode = e.code;

            // clean slate -- prevent ctrl keystroke from accidentally switching to another tab
            this.queuedSwitchItem = undefined;
        }
    }

    onKeyUp(e: KeyboardEvent) {
        if (e.code == this.ctrlKeyCode && this.ctrlPressedTimestamp) {
            this.ctrlPressedTimestamp = 0;
            this.switchItems = undefined;
            this.currentIndex = 0;

            this.modal?.close();

            if (this.queuedSwitchItem) {
                this.commitSwitchItem(this.queuedSwitchItem);
                this.queuedSwitchItem = undefined;
            }

            this.modal = undefined;
        }

        if (
            e.code == "Tab" &&
            this.ctrlPressedTimestamp &&
            this.settings.showModal &&
            !this.modal &&
            this.switchItems?.length
        ) {
            this.modal = new GeneralModal(this.switchItems, this);
            this.modal.open();
        }
    }

    onunload() {
        console.log("unloading plugin: Cycle through panes");
        window.removeEventListener("keydown", this.keyDownFunc);
        window.removeEventListener("keyup", this.keyUpFunc);
    }

    async loadSettings() {
        // returns null if .obsidian/plugins/cycle-through-panes/data.json does not exist
        const userSettings = await this.loadData();

        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            userSettings ? userSettings : NEW_USER_SETTINGS
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
