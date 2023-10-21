import { App, PluginSettingTab, Setting } from "obsidian";
import KeyValueListPlugin from "./main";

export interface KeyValueListPluginSettings {
	delimiter: string;
	displayDelimiter: boolean;
}

export const DEFAULT_SETTINGS: KeyValueListPluginSettings = {
	delimiter: ":",
	displayDelimiter: true,
};

export class SettingTab extends PluginSettingTab {
	plugin: KeyValueListPlugin;

	constructor(app: App, plugin: KeyValueListPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Delimiter")
			.setDesc("The character(s) that separate the key from the value")
			.addText((text) =>
				text
					.setPlaceholder(":")
					.setValue(this.plugin.settings.delimiter)
					.onChange(async (value) => {
						this.plugin.settings.delimiter = value;
						await this.plugin.saveSettings();
						this.plugin.refresh();
					})
			);

		new Setting(containerEl)
			.setName("Display delimiter")
			.setDesc("If the delimiter should be displayed in the key or not")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.displayDelimiter)
					.onChange(async (value) => {
						this.plugin.settings.displayDelimiter = value;
						await this.plugin.saveData(this.plugin.settings);
						// this.plugin.ac.refreseh
						this.plugin.refresh();
					})
			);
	}
}
