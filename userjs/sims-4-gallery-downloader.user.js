// ==UserScript==
// @name        TS4 gallery downloader
// @description Download households, lots and rooms from The Sims 4 Gallery website
// @author      anadius
// @match       *://www.ea.com/*/games/the-sims/the-sims-4/pc/gallery*
// @match       *://www.ea.com/games/the-sims/the-sims-4/pc/gallery*
// @connect     sims4cdn.ea.com
// @connect     athena.thesims.com
// @connect     www.thesims.com
// @connect     thesims-api.ea.com
// @version     2.2.0
// @namespace   anadius.github.io
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @grant       GM.getResourceUrl
// @grant       GM_getResourceURL
// @icon        https://anadius.github.io/ts4installer-tumblr-files/userjs/sims-4-gallery-downloader.png
// @resource    bundle.json https://anadius.github.io/ts4installer-tumblr-files/userjs/bundle.min.json?version=1.113.291
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require     https://cdn.jsdelivr.net/npm/long@4.0.0/dist/long.js#sha256-Cp9yM71yBwlF4CLQBfDKHoxvI4BoZgQK5aKPAqiupEQ=
// @require     https://cdn.jsdelivr.net/npm/file-saver@2.0.1/dist/FileSaver.min.js#sha256-Sf4Tr1mzejErqH+d3jzEfBiRJAVygvjfwUbgYn92yOU=
// @require     https://cdn.jsdelivr.net/npm/jszip@3.2.0/dist/jszip.min.js#sha256-VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// @require     https://cdn.jsdelivr.net/npm/protobufjs@6.8.8/dist/protobuf.min.js#sha256-VPK6lQo4BEjkmYz6rFWbuntzvMJmX45mSiLXgcLHCLE=
// ==/UserScript==

/* global protobuf, saveAs, JSZip, Long */
/* eslint curly: 0 */
/* eslint no-sequences: 0 */
/* eslint no-return-assign: 0 */

const TRAY_ITEM_URL = 'https://thesims-api.ea.com/api/gallery/v1/sims/{UUID}';
const DATA_ITEM_URL = 'http://sims4cdn.ea.com/content-prod.ts4/prod/{FOLDER}/{GUID}.dat';
const IMAGE_URL = 'https://athena.thesims.com/v2/images/{TYPE}/{FOLDER}/{GUID}/{INDEX}.jpg';

const EXCHANGE_HOUSEHOLD = 1;
const EXCHANGE_BLUEPRINT = 2;
const EXCHANGE_ROOM = 3;
const EXCHANGE_TATOO = 5;
const EXTENSIONS = {
  [EXCHANGE_HOUSEHOLD]: ['Household', 'householdbinary', 'hhi', 'sgi'],
  [EXCHANGE_BLUEPRINT]: ['Lot', 'blueprint', 'bpi', 'bpi'],
  [EXCHANGE_ROOM]: ['Room', 'room', 'rmi', null],
  [EXCHANGE_TATOO]: ['Tattoo', 'part', 'pti', 'pti'],
};
const IMAGE_TYPE = {
  [EXCHANGE_HOUSEHOLD]: 0,
  [EXCHANGE_BLUEPRINT]: 1,
  [EXCHANGE_ROOM]: 2,
  [EXCHANGE_TATOO]: 3,
};
const ADDITIONAL_IMAGE_GROUP = {
  [EXCHANGE_HOUSEHOLD]: 0x10,
  [EXCHANGE_BLUEPRINT]: 0x100,
  [EXCHANGE_TATOO]: 0x10,
};

const BIG_WIDTH = 591;
const BIG_HEIGHT = 394;
const SMALL_WIDTH = 300;
const SMALL_HEIGHT = 200;

const LONG_TYPES = [
  "sint64",
  "uint64",
  "int64",
  "sfixed64",
  "fixed64"
];

/* helper functions */

const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const reportError = e => {
  if(e.name && e.message && e.stack)
    alert(`${e.name}\n\n${e.message}\n\n${e.stack}`);
  else
    alert(e);
};

const xhr = details => new Promise((resolve, reject) => {
  const stack = new Error().stack;
  const reject_xhr = res => {
    console.log(res);
    reject({
      name: 'GMXHRError',
      message: `XHR for URL ${details.url} returned status code ${res.status}`,
      stack: stack,
      status: res.status
    });
  };
  GM.xmlHttpRequest(Object.assign(
    {method: 'GET'},
    details,
    {
      onload: res => {
        if(res.status === 404)
          reject_xhr(res);
        else
          resolve(res.response);
      },
      onerror: res => reject_xhr
    }
  ));
});

/* functions taken from thesims.min.js */

function dashify(uuid) {
  var slice = String.prototype.slice,
      indices = [
        [0, 8],
        [8, 12],
        [12, 16],
        [16, 20],
        [20]
      ];
  return indices.map(function(index) {
    return slice.apply(uuid, index)
  }).join("-")
}

function uuid2Guid(uuid) {
  if (-1 !== uuid.indexOf("-")) return uuid.toUpperCase();
  var decoded;
  try {
    decoded = atob(uuid)
  } catch (err) {
    return !1
  }
  for (var guid = "", i = 0; i < decoded.length; i++) {
    var ch = decoded.charCodeAt(i);
    ch = (240 & ch) >> 4, ch = ch.toString(16);
    var tmpstr = ch.toString();
    ch = decoded.charCodeAt(i), ch = 15 & ch, ch = ch.toString(16), tmpstr += ch.toString(), guid += tmpstr
  }
  return dashify(guid).toUpperCase()
}

function getFilePath(guid) {
  var bfnvInit = 2166136261;
  for (var fnvInit = bfnvInit, i = 0; i < guid.length; ++i) fnvInit += (fnvInit << 1) + (fnvInit << 4) + (fnvInit << 7) + (fnvInit << 8) + (fnvInit << 24), fnvInit ^= guid.charCodeAt(i);
  var result = (fnvInit >>> 0) % 1e4;
  return result = result.toString(16), result = "0x" + "00000000".substr(0, 8 - result.length) + result
};

// wrap everything in async anonymous function
(async () => {

/* tray item */

const getRandomId = () => {
  return new Long(
    getRandomIntInclusive(1, 0xffffffff),
    getRandomIntInclusive(0, 0xffffffff),
    true);
};

const createPrefix = num => {
  const arr = new ArrayBuffer(8);
  const view = new DataView(arr);
  view.setUint32(4, num, true);
  return new Uint8Array(arr);
};

const parseValue = (value, fieldType, isParentArray) => {
  let _;
  let parsedValue = value;
  const valueType = typeof value;
  if(valueType === "object") {
    if(Array.isArray(value)) {
      if(isParentArray) {
        throw "No clue how to handle array of arrays"
      }
      parsedValue = parseMessageArray(value, fieldType);
    }
    else {
      [parsedValue, _] = parseMessageObj(value, fieldType);
    }
  }
  else if(valueType === "string") {
    if(fieldType === "string" || fieldType === "bytes") {
      // no processing needed
    }
    else if(LONG_TYPES.includes(fieldType)) {
      parsedValue = Long.fromValue(value);
    }
    else {
      // value is enum, lookup the enum and extract the actual value
      parsedValue = root.lookupEnum(fieldType).values[value.split('.').pop()];
    }
  }

  return parsedValue;
};

const parseMessageArray = (messageArray, className) => {
  const parsedArray = [];
  messageArray.forEach(arrayItem => {
    parsedArray.push(parseValue(arrayItem, className, true));
  });
  return parsedArray;
};

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// EA likes to mess things up, in proto files they use snake case, in JSON they use camel case
// but there are some exceptions, so try both
const findKeyName = (key, messageClass) => {
  const fields = messageClass.fields;
  if(typeof messageClass.fields[key] !== "undefined")
    return key;

  const key2 = camelToSnakeCase(key);
  if(typeof messageClass.fields[key2] !== "undefined")
    return key2;

  const nameParts = [];
  let msgClass = messageClass;
  while(msgClass.name !== "" && typeof msgClass.name !== "undefined") {
    nameParts.unshift(msgClass.name);
    msgClass = msgClass.parent;
  }
  const name = nameParts.join(".");
  throw `${name} class doesn't have ${key} nor ${key2} key.`
};

const parseMessageObj = (messageObj, className) => {
  const keys = Object.keys(messageObj);

  const messageClass = root.lookupType(className);
  const parsedMessage = {};
  for(let i=0, l=keys.length; i<l; ++i) {
    // this makes sure that `key` is in `messageClass.fields`
    const key = findKeyName(keys[i], messageClass);
    parsedMessage[key] = parseValue(messageObj[keys[i]], messageClass.fields[key].type);
  }

  return [parsedMessage, messageClass];
};

const getTrayItem = async (uuid, guid, folder) => {
  let message;

  try {
    message = await xhr({
      url: TRAY_ITEM_URL.replace('{UUID}', encodeURIComponent(uuid)),
      responseType: 'json',
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': ''
      }
    });
  }
  catch(e) {
    if(e.name === 'GMXHRError') message = null;
    else throw e;
  }

  if(message === null || typeof message.error !== 'undefined')
    throw "Can't download tray file. This item was most probably deleted.";

  const [parsedMessage, messageClass] = parseMessageObj(message, "EA.Sims4.Network.TrayMetadata");
  // generate random ID
  parsedMessage.id = getRandomId();

  // get number of additional images; set sim IDs
  let additional = 0;
  if(parsedMessage.type === EXCHANGE_BLUEPRINT)
    additional = parsedMessage.metadata.bp_metadata.num_thumbnails - 1;
  else if(parsedMessage.type === EXCHANGE_HOUSEHOLD) {
    additional = parsedMessage.metadata.hh_metadata.sim_data.length;
    // the same logic of making new IDs is used later to fix the main data file
    parsedMessage.metadata.hh_metadata.sim_data.forEach((sim, i) => {
      sim.id = parsedMessage.id.add(i + 1);
    });
  }

  const encodedMessage = messageClass.encode(parsedMessage).finish();
  const prefix = createPrefix(encodedMessage.byteLength);
  const resultFile = new Uint8Array(prefix.length + encodedMessage.length);
  resultFile.set(prefix);
  resultFile.set(encodedMessage, prefix.length);

  return [
    resultFile, parsedMessage.type, parsedMessage.id, additional,
    parsedMessage.modifier_name || parsedMessage.creator_name, parsedMessage.name
  ];
};

/* data file */
const getDataItem = async (guid, folder, type, id) => {
  let response;
  try {
    response = await xhr({
      url: DATA_ITEM_URL.replace('{FOLDER}', folder).replace('{GUID}', guid),
      responseType: 'arraybuffer'
    });
  }
  catch(e) {
    if(e.name === 'GMXHRError' && e.status === 404)
      throw "Can't download data file. This item was most probably deleted.";
    else
      throw e;
  }
  if(type === EXCHANGE_HOUSEHOLD) {
    const messageClass = root.lookupTypeOrEnum('EA.Sims4.Network.FamilyData');
    let messageOffset, dataSuffixOffset;

    const view = new DataView(response);
    const dataVersion = view.getUint32(0, true); // read the format version

    if(dataVersion < 2) {
      messageOffset = 8;
      dataSuffixOffset = response.byteLength;
    }
    else {
      const mainItemLength = view.getUint32(4, true);
      messageOffset = 16;
      dataSuffixOffset = 4 + mainItemLength;
    }

    const messageLength = view.getUint32(messageOffset - 4, true); // read message length
    const message = messageClass.decode(new Uint8Array(response, messageOffset, messageLength)); // read and decode message
    // read the suffixes
    const messageSuffixOffset = messageOffset + messageLength;
    const messageSuffix = new Uint8Array(response, messageSuffixOffset, dataSuffixOffset - messageSuffixOffset);
    const dataSuffix = new Uint8Array(response, dataSuffixOffset);

    const newIdsDict = {};
    const sims = message.family_account.sim;
    sims.forEach((sim, i) => {
      newIdsDict[sim.sim_id.toString()] = id.add(1+i);
    });
    sims.forEach(sim => {
      sim.sim_id = newIdsDict[sim.sim_id.toString()];
      sim.significant_other = newIdsDict[sim.significant_other.toString()];
      sim.attributes.genealogy_tracker.family_relations.forEach(relation => {
        const newId = newIdsDict[relation.sim_id.toString()];
        if(typeof newId !== "undefined") {
          relation.sim_id = newId;
        }
      });
    });

    try {
      const editedMessage = new Uint8Array(messageClass.encode(message).finish());
      const resultArray = new Uint8Array(messageOffset + editedMessage.length + messageSuffix.length + dataSuffix.length);
      const resultView = new DataView(resultArray.buffer);
      resultView.setUint32(0, dataVersion, true);
      if(dataVersion >= 2) {
        resultView.setUint32(4, 8 + editedMessage.length + messageSuffix.length, true);
      }
      resultView.setUint32(messageOffset - 4, editedMessage.length, true);
      resultArray.set(editedMessage, messageOffset);
      resultArray.set(messageSuffix, messageOffset + editedMessage.length);
      resultArray.set(dataSuffix, messageOffset + editedMessage.length + messageSuffix.length);
      return resultArray.buffer;
    }
    catch(err) {
      console.error(err);
      return response;
    }
  }
  else
    return response;
};

/* image files */

const loadImage = url => new Promise(resolve => {
  xhr({
    url: url,
    responseType: 'blob'
  }).then(response => {
    const urlCreator = window.URL || window.webkitURL;
    const imageUrl = urlCreator.createObjectURL(response);

    const img = new Image();
    img.onload = () => {
      urlCreator.revokeObjectURL(img.src);
      resolve(img);
    };
    img.src = imageUrl;
  });
});

const newCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getImages = async (guid, folder, type, additional) => {
  const URL_TEMPLATE = IMAGE_URL.replace('{FOLDER}', folder).replace('{GUID}', guid).replace('{TYPE}', IMAGE_TYPE[type]);
  const big = newCanvas(BIG_WIDTH, BIG_HEIGHT);
  const small = newCanvas(SMALL_WIDTH, SMALL_HEIGHT);
  const images = [];
  for(let i=0; i<=additional; ++i) {
    let url = URL_TEMPLATE.replace('{INDEX}', i.toString().padStart(2, '0'));
    let img = await loadImage(url);
    let x, y, width, height;

    if(type == EXCHANGE_BLUEPRINT || (type == EXCHANGE_HOUSEHOLD && i > 0)) {
      width = Math.round(img.naturalHeight * BIG_WIDTH / BIG_HEIGHT);
      height = img.naturalHeight;
    }
    else {
      width = BIG_WIDTH;
      height = BIG_HEIGHT;
    }
    x = (img.naturalWidth - width) / 2;
    y = (img.naturalHeight - height) / 2;

    if(i == 0) {
      small.getContext('2d').drawImage(img, x, y, width, height, 0, 0, SMALL_WIDTH, SMALL_HEIGHT);
      images.push(small.toDataURL('image/jpeg').split('base64,')[1]);
    }
    big.getContext('2d').drawImage(img, x, y, width, height, 0, 0, BIG_WIDTH, BIG_HEIGHT);
    images.push(big.toDataURL('image/jpeg').split('base64,')[1]);
  }
  return images;
};

/* main download */

const generateName = (type, id, ext) => {
  const typeStr = '0x' + type.toString(16).toLowerCase().padStart(8, 0);
  const idStr = '0x' + id.toString(16).toLowerCase().padStart(16, 0);
  return typeStr + '!' + idStr + '.' + ext;
};

const toggleDownload = (scope, downloading) => {
  scope.vm.toggleDownload.toggling = downloading;
  scope.$apply();
};

const downloadItem = async scope => {
  try {
    const uuid = scope.vm.uuid;
    const guid = uuid2Guid(uuid);
    const folder = getFilePath(guid);

    toggleDownload(scope, true);
    const zip = new JSZip();

    const [trayItem, type, id, additional, author, title] = await getTrayItem(uuid, guid, folder);
    zip.file(generateName(type, id, 'trayitem'), trayItem);

    const [typeStr, dataExt, imageExt, additionalExt] = EXTENSIONS[type];

    const dataItem = await getDataItem(guid, folder, type, id);
    zip.file(generateName(0, id, dataExt), dataItem);

    const images = await getImages(guid, folder, type, additional);
    images.forEach((data, i) => {
      let group = i == 0 ? 2 : 3;
      let extension = i < 2 ? imageExt : additionalExt;
      let newId = id;
      if(i >= 2) {
        let j = i - 1;
        group += ADDITIONAL_IMAGE_GROUP[type] * j;
        if(type == EXCHANGE_HOUSEHOLD)
          newId = newId.add(j);
      }
      zip.file(generateName(group, newId, extension), data, {base64: true});
    });

    let filename = [author, typeStr, title, uuid.replace(/\+/g, '-').replace(/\//g, '_')].join('__');
    filename = filename.replace(/\s+/g, '_').replace(/[^a-z0-9\.\-=_]/gi, '');
    const content = await zip.generateAsync({type:'blob'});
    saveAs(content, filename + '.zip');
  }
  catch(e) {
    reportError(e);
  }
  toggleDownload(scope, false);
};

/* init */

let data = await fetch(await GM.getResourceUrl('bundle.json'));
let jsonDescriptor = await data.json();
const root = protobuf.Root.fromJSON(jsonDescriptor);

document.addEventListener('click', e => {
  let el = e.target;
  if(el.tagName === 'SPAN')
    el = el.parentNode.parentNode;
  else if(el.tagName === 'A')
    el = el.parentNode;

  if(el.tagName === 'LI' && el.classList.contains('stream-tile__actions-download')) {
    e.stopPropagation();
    const scope = unsafeWindow.angular.element(el).scope();
    downloadItem(scope);
  }
}, true);

console.log('running');

})();

/* add "force login" link */

const a = document.createElement('a');
a.href = 'https://www.thesims.com/login?redirectUri=' + encodeURIComponent(document.location);
a.innerHTML = '<b>force login</b>';
a.style.background = 'grey';
a.style.color = 'white';
a.style.display = 'inline-block';
a.style.position = 'absolute';
a.style.top = 0;
a.style.left = 0;
a.style.height = '40px';
a.style.lineHeight = '40px';
a.style.padding = '0 15px';
a.style.zIndex = 99999;
document.body.appendChild(a);
