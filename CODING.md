# Coding rules for eDo

## Code style
* Install [editor config](http://editorconfig.org/) in your editor, in order to
* be sure to follow the basic code style rules.

## Translations

* String in code should be placeholders.
* In order for the extractor to find all the labels to translate, wrap your
  string with `_(<string_code>)`.
* The translations can be extracted with the command `npm run extract`. By
  default, they will sorted in two `.json` files under `src/assets/i18n`.
