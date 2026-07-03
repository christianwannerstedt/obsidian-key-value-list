import { App, MarkdownPostProcessorContext } from "obsidian";
import { isActiveForFile } from "./css-classes";
import KeyValueListPlugin from "./main";
import { KeyValueListPluginSettings } from "./settings";
import { buildKeyValueRegex, isKeyValueListText } from "./parser";
import { renderKeyValueList, getReadingViewContentWidth } from "./renderer";

export function registerPostProcessor(plugin: KeyValueListPlugin): void {
  plugin.registerMarkdownPostProcessor((element, context) => {
    if (!shouldProcess(plugin.app, element, context, plugin.settings)) {
      return;
    }

    const regex = buildKeyValueRegex(plugin.settings);

    for (const listElement of element.findAll("ul")) {
      if (listElement.closest("pre")) continue;

      const listItems = Array.from(
        listElement.querySelectorAll(":scope > li")
      ) as HTMLElement[];

      if (listItems.length === 0) continue;

      const texts = listItems.map((item) => item.innerText.trim());
      if (!isKeyValueListText(texts, regex)) continue;

      listElement.replaceWith(
        renderKeyValueList(
          listItems,
          plugin.settings,
          getReadingViewContentWidth(listElement)
        )
      );
    }
  });
}

function shouldProcess(
  app: App,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
  settings: KeyValueListPluginSettings
): boolean {
  const isLivePreview =
    element.closest(".markdown-source-view") !== null;

  // Live Preview is handled by the editor extension, not the post-processor.
  if (isLivePreview) {
    return false;
  }

  return isActiveForFile(app, context.sourcePath, "read", settings);
}
