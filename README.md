# maplibre-gl-style-scratchpad

A custom [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/) control for editing, importing, and exporting map styles

## Features
- Edit MapLibre style JSON in a built-in editor
- Import style from local JSON file
- Export style as JSON file
- Apply style changes instantly via `map.setStyle()`

## Demo
[Demo](https://tjmsy.github.io/maplibre-gl-style-scratchpad/)

## Usage  

Import from CDN.

```javascript
import StyleScratchpadControl from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-style-scratchpad/src/StyleScratchpadControl.js";

```

Add control to map.

```javascript
map.addControl(new StyleScratchpadControl());
```
