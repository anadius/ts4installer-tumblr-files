// ==UserScript==
// @name        TS4 gallery downloader
// @author      anadius
// @match       *://www.ea.com/*/games/the-sims/the-sims-4/pc/gallery*
// @match       *://www.ea.com/games/the-sims/the-sims-4/pc/gallery*
// @version     1.0.3
// @grant       none
// @namespace   anadius.github.io
// @icon        https://anadius.github.io/ts4installer-tumblr-files/userjs/favicon.png
// ==/UserScript==

document.addEventListener('click', e => {
  let el = e.target;
  if(el.tagName === 'SPAN')
    el = el.parentNode.parentNode;
  else if(el.tagName === 'A')
    el = el.parentNode;
  
  if(el.tagName === 'LI' && el.classList.contains('stream-tile__actions-download')) {
    e.stopPropagation();
    const uuid = el.parentNode.parentNode.parentNode.getAttribute('uuid');
    window.open('https://ts4installer.tumblr.com/d?id=' + encodeURIComponent(uuid), '_blank');
  }
}, true);
