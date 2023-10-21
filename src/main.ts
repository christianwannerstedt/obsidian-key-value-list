import { Plugin } from "obsidian";
import { KeyValueList } from "src/key-value-list";
import {
	DEFAULT_SETTINGS,
	KeyValueListPluginSettings,
	SettingTab,
} from "./settings";
import { ListParser } from "./list-parser";

export default class KeyValueListPlugin extends Plugin {
	settings: KeyValueListPluginSettings;
	parser: ListParser;

	async onload() {
		await this.loadSettings();
		this.parser = new ListParser(this);
		new KeyValueList(this, this.parser).load();

		// Add a settings tab
		this.addSettingTab(new SettingTab(this.app, this));
	}

	refresh() {
		this.app.workspace.updateOptions();
		this.parser.update();
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
