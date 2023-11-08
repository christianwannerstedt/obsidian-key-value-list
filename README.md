# Key-Value list - Obsidian plugin

This plugin for [Obsidian](https://obsidian.md/) makes creating formatted key-value lists a breeze.

## What is a Key-Value list?
A Key-Value list is basically a list containing multiple rows with pairs of keys and values. These can be useful in all kind of different contexts, especially when something is to be described with a range of different attributes. The idea with this plugin is to give lists like that some additional formatting, without the need of any extra input or customizations at all. 

To create a key value list, all you need to do is to make sure the list row contains a specific delimiter. The default one used in this plugin is `:`. So, as an example, a simple list could look like this:

- First name: Donald
- Last name: Duck
- Gender: Male

This plugin will recognize these lists automatically and apply some basic formatting:
- A fixed width of the key node, so that values are all aligned properly. The width will be calculated for every list specifically, to make sure it is displayed in the best way.
- Apply a background color to every other line in the list, to make it easier to read.

## Preview
A short demo of the plugin in action:
[VIDEO]

If the value (or key) is too long to fit on the row, it will be properly wrapped to the next line. 
[IMAGE]

It's possible to use other formattings, i.e. bold text, links, tags, in both the key and value part.

## Customization
Even if the plugin doesn't require any customizations at all, you can fine tune it a bit with some available settings. From the plugin settings page it's possible to change the trigger bullet, delimiter, appearence etc.
[IMG]

## Notes
In order for a list to be considered a Key-Value list by this plugin, EVERY row, must contain a key value pair. If one or more rows don't contain a key-value pair, the list will be ignored by the plugin.

After a list has been edited, there is a possibility that there may be a one-render round delay until the background width is set correctly for the list.

## Install

### Manual installation
Unzip the [latest release](https://github.com/christianwannerstedt/obsidian-key-value-list/releases/latest) into your `<vault>/.obsidian/plugins/` folder.
