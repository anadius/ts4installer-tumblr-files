// ==UserScript==
// @name        TS3 exchange downloader
// @author      anadius
// @match       *://*.thesims3.com/*
// @version     1.0
// @grant       none
// @namespace   anadius.github.io
// @icon        https://anadius.github.io/ts4installer-tumblr-files/userjs/sims-3-exchange.png
// ==/UserScript==

function findLink(html) {
	const matches = html.match(/http[^"']+\.sims3pack/i);
  return matches === null ? undefined : matches[0];
}

async function loginAndDownload(ignore, id) {
  // link could be cached already
  let link = CACHE[id];

  // this will work only on details page
  if(typeof link === 'undefined') {
    link = findLink(document.body.innerHTML);
  }

  // this should work everywhere
  if(typeof link === 'undefined') {
    const result = await fetch('https://' + window.location.hostname + '/assetDetail.html?assetId=' + id);
    const html = await result.text();
    link = findLink(html);
  }

  // just to make sure the link is there
  if(typeof link === 'undefined') {
    alert('Could not find download link, please report this error.');
  }
  else {
    CACHE[id] = link;
    window.location = link;
    //window.open(link, '_blank');
  }
}

window.setTimeout('const CACHE = {};' + findLink.toString() + loginAndDownload.toString(), 0);
