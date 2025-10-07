import { PluginSettingTab, Setting } from "obsidian";
import CycleThroughPanes from "./main";
import { Settings } from "./types";

export default class CTPSettingTab extends PluginSettingTab {
    settings: Settings;
    plugin: CycleThroughPanes;

    constructor(plugin: CycleThroughPanes, settings: Settings) {
        super(plugin.app, plugin);
        this.settings = settings;
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h2", {
            text: "Cycle through Panes Configuration",
        });

        new Setting(containerEl)
            .setName("Cycle target")
            .setDesc(
                "Choose whether Ctrl/Cmd + Tab cycles open workspace tabs or recently opened files."
            )
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("tabs", "Workspace tabs")
                    .addOption("recent-files", "Recent files")
                    .setValue(this.settings.switchMode)
                    .onChange(async (value) => {
                        this.settings.switchMode =
                            value as Settings["switchMode"];
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Only cycle through tabs with specific View Types")
            .addToggle((cb) => {
                cb.setValue(this.settings.useViewTypes);
                cb.onChange(async (value) => {
                    this.settings.useViewTypes = value;
                    await this.plugin.saveSettings();
                });
            });

        const descEl = createFragment();
        descEl.append(
            createEl("p", {
                text: "If the option above is enabled: These are the View Types this Plugin will cycle through using any of the available commands.",
            }),
            createEl("p", {
                text: 'To add a new View Type to this List, simply run the Command: "Cycle through Panes: Enable this View Type". More advanced Users can edit and delete the Types in the text field (one per line).',
            })
        );

        new Setting(containerEl)
            .setName("Enabled View Types")
            .setDesc(descEl)
            .addTextArea((cb) => {
                let value = "";
                this.settings.viewTypes.forEach(
                    (type) => (value += type + "\n")
                );
                cb.setValue(value);
                cb.setPlaceholder("markdown");
                cb.onChange(async (newValue) => {
                    //                                                    No empty lines
                    this.settings.viewTypes = newValue
                        .split("\n")
                        .filter((pre) => !!pre);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Show modal when switching tabs")
            .addToggle((cb) => {
                cb.setValue(this.settings.showModal);
                cb.onChange(async (value) => {
                    this.settings.showModal = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Focus tab on release")
            .setDesc(
                "If enabled, defer switching tabs until the ctrl key is released, similar to VS Code and Firefox"
            )
            .addToggle((cb) => {
                cb.setValue(this.settings.focusLeafOnKeyUp);
                cb.onChange(async (value) => {
                    this.settings.focusLeafOnKeyUp = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl).setName("Skip pinned tabs").addToggle((cb) => {
            cb.setValue(this.settings.skipPinned);
            cb.onChange(async (value) => {
                this.settings.skipPinned = value;
                await this.plugin.saveSettings();
            });
        });

        new Setting(containerEl)
            .setName("Stay in current split")
            .setDesc(
                "If enabled and the currently active file is in the sidebar, you cycle within that sidebar and can't switch to the main tabs. Use the "
            )
            .addToggle((cb) => {
                cb.setValue(this.settings.stayInSplit);
                cb.onChange(async (value) => {
                    this.settings.stayInSplit = value;
                    await this.plugin.saveSettings();
                });
            });
    }
}
