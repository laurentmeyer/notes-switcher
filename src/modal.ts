import { SuggestModal } from "obsidian";
import CycleThroughPanes from "./main";
import { SwitchItem } from "./types";

export class GeneralModal extends SuggestModal<SwitchItem> {
    resolve: (value: number) => void;

    constructor(
        private items: SwitchItem[],
        private readonly plugin: CycleThroughPanes
    ) {
        super(app);
    }

    open(): Promise<number> {
        this.dimBackground = false;
        super.open();

        const initialIndex = this.items.length > 1 ? 1 : 0;
        this.chooser.setSelectedItem(initialIndex);
        this.focusItem();

        this.containerEl
            .getElementsByClassName("prompt-input-container")
            .item(0)
            .detach();

        // hotkey = this.app.hotkeyManager.bakedIds.find((e)=>e == "")

        this.scope.register(["Ctrl"], "Tab", (e) => {
            this.chooser.setSelectedItem(this.chooser.selectedItem + 1);
            this.focusItem();
        });

        this.scope.register(["Ctrl", "Shift"], "Tab", (e) => {
            this.chooser.setSelectedItem(this.chooser.selectedItem - 1);
            this.focusItem();
        });

        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    onClose() {
        if (this.resolve) this.resolve(this.chooser.selectedItem);
    }

    getSuggestions(query: string): SwitchItem[] {
        return this.items;
    }

    renderSuggestion(item: SwitchItem, el: HTMLElement): void {
        el.setText(this.plugin.getSwitchItemLabel(item));
    }

    onChooseSuggestion(item: SwitchItem, evt: MouseEvent | KeyboardEvent) {
        if (item) {
            this.plugin.commitSwitchItem(item);
        }
    }

    focusItem(): void {
        const item = this.items[this.chooser.selectedItem];
        if (item) {
            this.plugin.queueSwitchItem(item);
        }
    }
}
