import {
  App,
  ButtonComponent,
  ColorComponent,
  PluginSettingTab,
  Setting,
  SliderComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import KeyValueListPlugin from "./main";

export interface KeyValueListPluginSettings {
  activeInEditMode: boolean;
  activeInReadMode: boolean;
  displayBullet: boolean;
  delimiter: string;
  displayDelimiter: boolean;
  maxKeyWidth: number;
  verticalPadding: number;
  horizontalPadding: number;
  boldKey: boolean;
  stripedBackgroundType: string;
  stripedBackgroundColor: string;
  isKeyColored: boolean;
  keyColor: string;
  isValueColored: boolean;
  valueColor: string;
}

export const DEFAULT_SETTINGS: KeyValueListPluginSettings = {
  activeInEditMode: true,
  activeInReadMode: true,
  displayBullet: false,
  delimiter: ":",
  displayDelimiter: true,
  maxKeyWidth: 50,
  verticalPadding: 3,
  horizontalPadding: 12,
  boldKey: true,
  stripedBackgroundType: "default",
  stripedBackgroundColor: "",
  isKeyColored: false,
  keyColor: "",
  isValueColored: false,
  valueColor: "",
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
      .setName("Active in edit mode")
      .setDesc("If the plugin should be active in edit mode")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.activeInEditMode)
          .onChange(async (value) => {
            this.plugin.settings.activeInEditMode = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Active in read mode")
      .setDesc("If the plugin should be active in read mode")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.activeInReadMode)
          .onChange(async (value) => {
            this.plugin.settings.activeInReadMode = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Display bullet")
      .setDesc("If the bullet should be displayed or not")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.displayBullet)
          .onChange(async (value) => {
            this.plugin.settings.displayBullet = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    new Setting(containerEl)
      .setName("Delimiter")
      .setDesc("The character(s) that separate the key from the value")
      .addText((text: TextComponent) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.delimiter)
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
          .setPlaceholder(DEFAULT_SETTINGS.verticalPadding.toString())
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
          .setPlaceholder(DEFAULT_SETTINGS.horizontalPadding.toString())
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

    new Setting(containerEl)
      .setName("Bold keys")
      .setDesc("It the keys should be rendered in a bold font")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.boldKey)
          .onChange(async (value) => {
            this.plugin.settings.boldKey = value;
            await this.plugin.saveData(this.plugin.settings);
            this.plugin.refresh();
          })
      );

    const backgroundColorOptions = [
      { key: "none", label: "No background color" },
      { key: "default", label: "Default background color (based on theme)" },
      { key: "custom", label: "Custom background color" },
    ];

    new Setting(containerEl)
      .setName("Striped background")
      .setDesc("Choose if even rows should have another background color")
      .addDropdown((dropdown) => {
        backgroundColorOptions.forEach((option) => {
          dropdown.addOption(option.key, option.label);
        });
        dropdown.setValue(this.plugin.settings.stripedBackgroundType);
        dropdown.onChange(async (value) => {
          this.plugin.settings.stripedBackgroundType = value;
          await this.plugin.saveData(this.plugin.settings);
          this.display();
          this.plugin.refresh();
        });
      });

    if (this.plugin.settings.stripedBackgroundType === "custom") {
      new Setting(containerEl)
        .setName("Striped background color")
        .setDesc("Choose the color of the striped background.")
        .addColorPicker((color: ColorComponent) =>
          color
            .setValue(this.plugin.settings.stripedBackgroundColor)
            .onChange(async (value) => {
              this.plugin.settings.stripedBackgroundColor = value;
              await this.plugin.saveData(this.plugin.settings);
              this.plugin.refresh();
            })
        );
    }

    new Setting(containerEl)
      .setName("Custom key color")
      .setDesc("If a custom color should be used for the keys")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.isKeyColored)
          .onChange(async (value) => {
            this.plugin.settings.isKeyColored = value;
            await this.plugin.saveData(this.plugin.settings);
            this.display();
            this.plugin.refresh();
          })
      );

    if (this.plugin.settings.isKeyColored) {
      new Setting(containerEl)
        .setName("Key color")
        .setDesc("Choose the color of the keys.")
        .addColorPicker((color: ColorComponent) =>
          color
            .setValue(this.plugin.settings.keyColor)
            .onChange(async (value) => {
              this.plugin.settings.keyColor = value;
              await this.plugin.saveData(this.plugin.settings);
              this.plugin.refresh();
            })
        );
    }

    new Setting(containerEl)
      .setName("Custom value color")
      .setDesc("If a custom color should be used for the values")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.isValueColored)
          .onChange(async (value) => {
            this.plugin.settings.isValueColored = value;
            await this.plugin.saveData(this.plugin.settings);
            this.display();
            this.plugin.refresh();
          })
      );

    if (this.plugin.settings.isValueColored) {
      new Setting(containerEl)
        .setName("Value color")
        .setDesc("Choose the color of the values.")
        .addColorPicker((color: ColorComponent) =>
          color
            .setValue(this.plugin.settings.valueColor)
            .onChange(async (value) => {
              this.plugin.settings.valueColor = value;
              await this.plugin.saveData(this.plugin.settings);
              this.plugin.refresh();
            })
        );
    }

    new Setting(containerEl)
      .setName("Reset settings")
      .setDesc("Reset all settings to their default values")
      .addButton((button: ButtonComponent) =>
        button.setButtonText("Reset settings").onClick(async () => {
          if (confirm("Are you sure you want to reset the settings?")) {
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
            await this.plugin.saveData(this.plugin.settings);
            this.display();
            this.plugin.refresh();
          }
        })
      );
  }
}
