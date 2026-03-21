import { load } from './js/store.js';
import { renderAll } from './js/render.js';
import { bindEvents } from './js/events.js';

load().then(() => {
  renderAll();
  bindEvents();
});
