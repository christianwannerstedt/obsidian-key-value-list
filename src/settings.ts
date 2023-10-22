import {
  App,
  PluginSettingTab,
  Setting,
  SliderComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import KeyValueListPlugin from "./main";

export interface KeyValueListPluginSettings {
  delimiter: string;
  displayDelimiter: boolean;
  maxKeyWidth: number;
  verticalPadding: number;
  horizontalPadding: number;
}

export const DEFAULT_SETTINGS: KeyValueListPluginSettings = {
  delimiter: ":",
  displayDelimiter: true,
  maxKeyWidth: 0,
  verticalPadding: 4,
  horizontalPadding: 10,
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
      .addText((text: TextComponent) =>
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
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.displayDelimiter)
          .onChange(async (value) => {
            this.plugin.settings.displayDelimiter = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Max key width")
      .setDesc(
        "Maximum width of the key in percent of the editor width. 0 = no limit"
      )
      .addSlider((slider: SliderComponent) =>
        slider
          .setLimits(0, 99, 1)
          .setValue(this.plugin.settings.maxKeyWidth)
          .setDynamicTooltip()
          .onChange(async (value: number) => {
            this.plugin.settings.maxKeyWidth = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Vertical padding")
      .setDesc("Vertical padding of the key-value list rows (in pixels)")
      .addText((text: TextComponent) =>
        text
          .setPlaceholder("4")
          .setValue(this.plugin.settings.verticalPadding?.toString())
          .onChange(async (value) => {
            let numericValue = parseInt(value);
            if (isNaN(numericValue)) {
              numericValue = 0;
            }
            this.plugin.settings.verticalPadding = numericValue;
            text.setValue(numericValue.toString());
            await this.plugin.saveSettings();
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Horizontal padding")
      .setDesc("Horizontal padding of the key-value list rows (in pixels)")
      .addText((text: TextComponent) =>
        text
          .setPlaceholder("4")
          .setValue(this.plugin.settings.horizontalPadding?.toString())
          .onChange(async (value) => {
            let numericValue = parseInt(value);
            if (isNaN(numericValue)) {
              numericValue = 0;
            }
            this.plugin.settings.horizontalPadding = numericValue;
            text.setValue(numericValue.toString());
            await this.plugin.saveSettings();
            this.plugin.refresh();
          })
      );
  }
}
