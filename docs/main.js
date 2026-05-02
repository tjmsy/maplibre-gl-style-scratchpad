import StyleScratchpad from '../src/StyleScratchpadControl.js';
import StyleScratchpad from "https://cdn.jsdelivr.net/gh/tjmsy/maplibre-gl-style-scratchpad/src/StyleScratchpadControl.js";

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [0, 0],
  zoom: 1,
  hash: true,
});
map.addControl(new StyleScratchpad(), 'top-left');
