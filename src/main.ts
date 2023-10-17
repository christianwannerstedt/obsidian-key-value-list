import { Plugin } from "obsidian";
import { KeyValueList } from "src/KeyValueList";

interface KeyValueListPluginSettings {
	seperator: string;
}

const DEFAULT_SETTINGS: KeyValueListPluginSettings = {
	seperator: ": ",
};

export default class KeyValueListPlugin extends Plugin {
	settings: KeyValueListPluginSettings;

	async onload() {
		await this.loadSettings();
		new KeyValueList(this).load();
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
