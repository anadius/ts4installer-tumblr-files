// ==UserScript==
// @name        TS4 gallery downloader
// @author      anadius
// @match       *://www.ea.com/*/games/the-sims/the-sims-4/pc/gallery*
// @match       *://www.ea.com/games/the-sims/the-sims-4/pc/gallery*
// @version     1.0
// @grant       unsafeWindow
// @namespace   anadius.github.io
// @icon        https://anadius.github.io/ts4installer-tumblr-files/userjs/favicon.png
// ==/UserScript==

const realDownload = async (uuid, debug) => {
  const result = await fetch('https://anadius.heliohost.org/ts4gallery/download.php?id=' + encodeURIComponent(uuid), {mode: "cors"});
  const data = await result.json();
  if(debug === true) {
    console.log(uuid, data);
  }
  else {
    if(data.success)
      window.open('https://simfileshare.net' + data.url, '_blank');
    else
      alert(data.message);
  }
};

const toggleDownload = (scope, downloading) => {
  scope.vm.toggleDownload.toggling = downloading;
  scope.$apply();
};

const download = async element => {
  const scope = unsafeWindow.angular.element(element).scope();
  toggleDownload(scope, true);
  await realDownload(scope.vm.uuid, unsafeWindow.debug);
  toggleDownload(scope, false);
};

document.addEventListener('click', e => {
  let el = e.target;
  if(el.tagName === 'SPAN')
    el = el.parentNode.parentNode;
  else if(el.tagName === 'A')
    el = el.parentNode;
  
  if(el.tagName === 'LI' && el.classList.contains('stream-tile__actions-download')) {
    e.stopPropagation();
    download(el);
  }
}, true);
