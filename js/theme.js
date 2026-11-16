/* Runs synchronously in <head> so a saved theme applies before first paint. */
(function () {
  'use strict';
  var saved = null;
  try { saved = localStorage.getItem('mfenc-theme'); } catch (e) { /* storage blocked: follow the system */ }
  if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
})();
