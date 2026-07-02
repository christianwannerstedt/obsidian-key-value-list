import { MarkdownView, Plugin } from "obsidian";
import {
  DEFAULT_SETTINGS,
  KeyValueListPluginSettings,
  SettingTab,
} from "./settings";
import { registerPostProcessor } from "./post-processor";
import { registerLivePreview } from "./live-preview";

export default class KeyValueListPlugin extends Plugin {
  settings: KeyValueListPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    registerPostProcessor(this);
    registerLivePreview(this);

    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        this.rerender();
      })
    );
  }

  rerender() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      view.previewMode.rerender(true);
    }
  }

  refresh() {
    this.app.workspace.updateOptions();
    this.rerender();
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
