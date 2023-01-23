(async () => {

let q = window.location.search;
const FORMAT = (q.indexOf('disqus') > -1 ? 'Disqus' : (q.indexOf('discord') > -1 ? 'Discord' : (q.indexOf('forum') > -1 ? 'Forum' : 'NONE')))
q = undefined;

const FORMAT_DICT = {
  'Forum': {
    start: '[spoiler="report"]\n',
    end: '[/spoiler]',
    bold_s: '[b]',
    bold_e: '[/b]',
    head_s: '[color=#026526][b][u]',
    head_e: '[/u][/b][/color]'
  },
  'Disqus': {
    start: '<blockquote><code>',
    end: '</code></blockquote>',
    bold_s: '<b>',
    bold_e: '</b>',
    head_s: '</code><u><b>',
    head_e: '</b></u><code>'
  },
  'Discord': {
    start: '```yaml\n',
    end: '```',
    bold_s: '',
    bold_e: '',
    head_s: '#',
    head_e: ''
  }
};

const LANGUAGE_DICT = {
  'cs_cz': 'cze_cz',
  'da_dk': 'dan_dk',
  'de_de': 'ger_de',
  'en_us': 'eng_us',
  'es_es': 'spa_es',
  'fi_fi': 'fin_fi',
  'fr_fr': 'fre_fr',
  'it_it': 'ita_it',
  'ja_jp': 'jpn_jp',
  'ko_kr': 'kor_kr',
  'nl_nl': 'dut_nl',
  'no_no': 'nor_no',
  'pl_pl': 'pol_pl',
  'pt_br': 'por_br',
  'ru_ru': 'rus_ru',
  'sv_se': 'swe_se',
  'zh_cn': 'chs_cn',
  'zh_tw': 'cht_cn'
};

const UNKNOWN_FILES_FILTERING = [
  ['Steam files', /^(?:__overlay\/(?:overlayinjector\.exe|steam_api\.dll)|data\/client\/tmp.txt|debug.log|eastore.ini|installscript.vdf|steam_appid.txt)$/i],
  ['FitGirl repack files', /^(?:_redist\/(?:dxwebsetup\.exe|fitgirl\.md5|quicksfv\.(?:exe|ini)|vc_?redist.*?\.exe)|language changer\/.*?\.reg)$/i],
  ['Uninstaller files', /^unins\d{3}\.(?:dat|exe)$/i],
];

// https://stackoverflow.com/a/50636286/2428152
function partition(array, filter) {
  let pass = [], fail = [];
  array.forEach((e, idx, arr) => (filter(e, idx, arr) ? pass : fail).push(e));
  return [pass, fail];
}

const downloadBlob = (blob, name) => {
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(url);
  link.remove();
};

const randomLetters = () => Math.random().toString(36).replace(/[^a-z]+/g, '');

const addInfo = (info, name, value, list, edit) => {
  if(typeof list == 'undefined')
    list = false;
  if(typeof edit == 'undefined')
    edit = false;

  if(Array.isArray(value)) {
    value = value.join(list ? '\n' : ', ');
  }
  
  if(typeof value == 'string') {
    if(edit) {
      info.find(x => x[0] === name)[1] += value;
    }
    else {
      info.push([name, value, list]);
    }
  }
}

const rawReport = (info, f) => {
  let report = f.start;

  for(let [name, value, list] of info) {
    if(list)
      report += f.head_s + name + ':' + f.head_e + '\n' + value + '\n';
    else
      report += name + ': ' + f.bold_s + value + f.bold_e + '\n';
  }

  return report + f.end;
};

// generate reports for all formats
const generateReports = (info) => {
  for(let formatName of Object.keys(FORMAT_DICT)) {
    let f = FORMAT_DICT[formatName], report = rawReport(info, f),
        $card = $('.template > .card').clone();

    $card.find('textarea').val(report)
    $card.find('button')
      .attr('data-target', `#c-${formatName}`)
      .html(formatName);
    $card.find('.collapse')
      .attr('id', `c-${formatName}`)
      .collapse((formatName == FORMAT ? 'show' : 'hide'));

    $('#report').append($card);
  }
  $('#report').show();
};

const alwaysHash = path => (
  path.match(/\/bin(?:_le)?\/(?:ts4(?:_x64)?\.exe|anadius\d|orangeemu)/) !== null
  // path.endsWith('.exe') && path.indexOf('/bin/ts4') > -1
);

// calculate missing hashes and return simplified object
const calculateHashes = async (filesInfo, quickScan) => {
  let hashes = {}, processedSize = 0, totalSize = 0, toCalculate = [];

  $('#hashing').show();

  for(let path of Object.keys(filesInfo)) {
    let fileInfo = filesInfo[path];

    if(typeof fileInfo.hash == 'undefined') {
      if(quickScan && !alwaysHash(path))
        hashes[path] = null;
      else {
        toCalculate.push(path);
        totalSize += fileInfo.file.size;
      }
    }
    else
      hashes[path] = fileInfo.hash;
  }
  for(let path of toCalculate) {
    let fileInfo = filesInfo[path];

    hashes[path] = await calculateMD5(fileInfo.file);
    processedSize += fileInfo.file.size;

    let progress = prog2percent(processedSize / totalSize);
    $('#total-progress')
      .css('width', progress)
      .html(progress);
  }

  $('#hashing').hide();

  return hashes;
};

const addGameCrackedHashes = (source, destination) => {
  for(let key of Object.keys(source)) {
    if(key.startsWith('game/'))
      destination[key.replace('game/', 'game-cracked/')] = source[key];
  }
};

const updateDict = (source, destination) => {
  for(let key of Object.keys(source)) {
    destination[key] = source[key];
  }
};

const filterHashes = hashes => Object.entries(hashes).reduce(
  (ret, entry) => {
    const [key, value] = entry;
    if(!key.startsWith('__installer/') && !key.startsWith('soundtrack/') && !key.startsWith('support/'))
      ret[key] = value;
    return ret;
  }, {});

const pickCrack = (filesInfo, info, legit, crack) => {
  for(const [crack_name, detection_file, crack_hashes] of crack) {
    const name = 'game' + (legit ? '-cracked' : '') + '/bin/' + detection_file;
    if(typeof filesInfo[name] !== 'undefined') {
      addInfo(info, 'Crack used', crack_name.toUpperCase());
      return crack_hashes;
    }
  }

  if(legit && crack.length > 0) {
    const [crack_name, detection_file, crack_hashes] = crack[0];
    addInfo(info, 'Crack used', crack_name.toUpperCase());
    return crack_hashes;
  }

  addInfo(info, 'Crack used', 'unknown, assuming legit game');
  return {};
};

const parseCracks = cracks => {
  const filtered = {};
  for(const crack of cracks) {
    if(typeof filtered[crack[0]] === 'undefined')
      filtered[crack[0]] = crack;
    else {
      const hashes = filtered[crack[0]][2];
      for(const [file, hash] of Object.entries(crack[2])) {
        if(typeof hashes[file] === "string")
          hashes[file] = [hashes[file], hash];
        else
          hashes[file].push(hash);
      }
    }
  }
  return Object.values(filtered);
};

const getHashes = async (version, filesInfo, info, legit) => {
  let response = await fetch(`${GITHUB_URL}hashes/${version}.json?${randomLetters()}=${randomLetters()}`);

  if(!response.ok) {
    alert(`hashes for version ${version} not found on server`);
    throw 'hashes not found';
  }

  let all_hashes = JSON.parse((await response.text()).toLowerCase()), hash_version = 1, hashes, crack, newFormat = false;

  // new format: {"crack": {...}, "hashes": {...}}
  if(typeof all_hashes.hashes == 'object') {
    hash_version = 2;
    ({hashes, crack} = all_hashes);
    newFormat = true;

    // even newer version
    if(typeof all_hashes.version !== 'undefined') {
      hash_version = all_hashes.version;
    }
  }
  else {
    hashes = all_hashes;
  }

  if(hash_version > 3) {
    crack = parseCracks(crack);
  }

  if(hash_version > 2) {
    crack = pickCrack(filesInfo, info, legit, crack);
  }

  // if legit, set hashes of Game-cracked to the same as for Game
  if(legit)
    addGameCrackedHashes(hashes, hashes);
  // if it's new format, add crack hashes to Game or Game-cracked (when legit)
  if(newFormat)
    (legit ? addGameCrackedHashes : updateDict)(crack, hashes);

  return filterHashes(hashes);
};

const olderThan = (ver1, ver2) => {
  try {
    const parts1 = ver1.split('.'), parts2 = ver2.split('.');
    for(let i=0; i<3; ++i) {
      let part1 = Number(parts1[i]), part2 = Number(parts2[i]);
      if(part1 < part2)
        return true;
      if(part1 > part2)
        return false;
    }
  }
  catch (ignore) {}

  return false;
};

// if there are only language files or none at all, mark as not installed
// instead of listing all files under unknown files
const detectMissingDLCs = (missing, paths, info, version) => {
  let folders = new Set();
  for(let path of missing) {
    folders.add(path.split('/', 1)[0]);
  }
  
  for(let folder of folders) {
    if(folder.match(/^(?:[segf]p\d{2}|delta_le)$/) === null)
      folders.delete(folder);
  }

  if(folders.size > 0) {
    for(let path of paths) {
      let pathParts = path.split('/'), folder = pathParts[0],
          file = pathParts[pathParts.length - 1];
      if(!folders.has(folder) || file.startsWith('strings_'))
        continue;

      folders.delete(folder);
    }
  }

  let pattern = new RegExp('^(' + Array.from(folders).join('|') + ')/'),
      should_filter = folders.size > 0;

  let LEinstalled = null;
  if(!olderThan(version, '1.58.63')) {
    LEinstalled = !folders.has('delta_le');
    addInfo(info, 'Legacy Edition', (LEinstalled ? '' : 'not ') + 'installed');
    folders.delete('delta_le');
  }

  if(folders.size > 0)
    addInfo(
      info, 'DLCs not installed',
      Array.from(folders).map(x => x.toUpperCase()).sort()
    );

  if(should_filter)
    missing = missing.filter(x => x.match(pattern) === null);
  return [missing, LEinstalled];
};

// validate game files
const validate = async (version, filesInfo, info, quickScan, legit, ignoredLanguages) => {
  let missing = [], unknown = [], mismatch = [], dlcFiles = {},
      serverHashes = await getHashes(version, filesInfo, info, legit);

  for(let path of Object.keys(filesInfo)) {
    if(typeof serverHashes[path] == 'undefined') {
      unknown.push(path);
      delete filesInfo[path];
    }
  }

  if(quickScan)
    mismatch.push('--- quick scan ---');

  let userHashes = await calculateHashes(filesInfo, quickScan);

  for(let path of Object.keys(userHashes)) {
    let hash = userHashes[path];
    if(hash !== null) {
      // single hash
      if(typeof serverHashes[path] === 'string') {
        if(hash !== serverHashes[path])
          mismatch.push(path);
      }
      // array of hashes
      else {
        if(serverHashes[path].indexOf(hash) === -1)
          mismatch.push(path);
      }
    }
    delete serverHashes[path];
  }

  missing = Object.keys(serverHashes);
  if(ignoredLanguages.length > 0) {
    let pattern = new RegExp('strings_(' + ignoredLanguages.join('|') + ').package$');
    missing = missing.filter(x => x.match(pattern) === null);
  }
  let LEinstalled;
  [missing, LEinstalled] = detectMissingDLCs(missing, Object.keys(userHashes), info, version);

  if(LEinstalled === true) {
    const filteredMissing = missing.filter(x => x.match(/^delta_le\/.*?\/strings_.{3}_.{2}\.package$/i) === null);
    if(missing.length !== filteredMissing.length && !filteredMissing.some(x => x.match(/^delta_le\//i))) {
      // we were missing only the lang files
      missing = filteredMissing;
      addInfo(info, 'Legacy Edition', ', missing lang files', undefined, true);
    }
  }
  else if(LEinstalled === false) {
    const filteredMissing = missing.filter(x => x.match(/^game\/bin_le\//i) === null);
    if(missing.length !== filteredMissing.length) {
      // we don't care about Bin_LE folder, it's for Legacy Edition anyway
      missing = filteredMissing;
      addInfo(info, 'Legacy Edition', ', no Bin_LE', undefined, true);
    }
  }

  addInfo(info, 'Hash mismatch', mismatch.sort(), true);
  addInfo(info, 'Missing files', missing.sort(), true);

  // additional filtering of unknown files
  for(const [name, pattern] of UNKNOWN_FILES_FILTERING) {
    let filtered;
    [unknown, filtered] = partition(unknown, x => x.match(pattern) === null);
    if(filtered.length > 0) {
      addInfo(info, name, filtered.sort(), true);
    }
  }

  addInfo(info, 'Unknown files', unknown.sort(), true);
  generateReports(info);
};

// read file (blob) as text or array buffer asynchronously
const readAs = (file, type) => new Promise(resolve => {
  let reader = new FileReader();
  reader.onload = e => {
    resolve(e.target.result);
  };
  if(type == 'text')
    reader.readAsText(file);
  else
    reader.readAsArrayBuffer(file);
});

const prog2percent = prog => Math.min(100, 100 * prog).toFixed() + '%';

let md5 = null;
const calculateMD5 = async file => {
  if(md5 === null)
    md5 = await hashwasm.createMD5();
  md5.init();

  $('#hashing-name').html(file.webkitRelativePath);
  for(let size=file.size, chunkSize = 8*1024*1024, offset=0; offset<size; offset+=chunkSize) {
    let progress = prog2percent(offset / size);
    $('#hashing-progress')
      .css('width', progress)
      .html(progress);
    let fileSlice = file.slice(offset, offset + chunkSize),
        chunk = await readAs(fileSlice, 'arraybuffer');
    md5.update(new Uint8Array(chunk));
  }
  $('#hashing-progress').css('width', '100%').html('100%');

  return md5.digest().toLowerCase();
};

const getVersionFromFile = async (file, regexp) => {
  let contents = await readAs(file, 'text'),
    matches = contents.match(regexp);
  if(matches)
    return matches[1];
  else
    return null;
};

// get version from default.ini
const getGameVersion = async file => {
  return await getVersionFromFile(file, /^\s*gameversion\s*=\s*([\d\.]+)\s*$/m)
};

// get version from codex.cfg or anadius.cfg
const getCrackVersion = async file => {
  return await getVersionFromFile(file, /^\s*"Version"\s+"([\d\.]+)"\s*$/m)
};

const getVersion = async (filesInfo, info) => {
  let tmp, legit = false, wrongDir = true,
      gameVersion = gameCrackedVersion = crackVersion = null;

  tmp = filesInfo['game/bin/default.ini'];
  if(typeof tmp !== 'undefined') {
    gameVersion = await getGameVersion(tmp.file);
    wrongDir = false;
  }
  tmp = filesInfo['game-cracked/bin/default.ini'];
  if(typeof tmp !== 'undefined') {
    gameCrackedVersion = await getGameVersion(tmp.file);
    wrongDir = false;
    legit = true;
  }
  else if(typeof filesInfo['game-cracked/bin/ts4_x64.exe'] !== 'undefined') {
    wrongDir = false;
    legit = true;
  }
  tmp = filesInfo['game' + (legit ? '-cracked' : '') + '/bin/anadius.cfg'];
  if(typeof tmp !== 'undefined') {
    crackVersion = await getCrackVersion(tmp.file);
    wrongDir = false;
  }
  if(crackVersion === null) {
    tmp = filesInfo['game' + (legit ? '-cracked' : '') + '/bin/codex.cfg'];
    if(typeof tmp !== 'undefined') {
      crackVersion = await getCrackVersion(tmp.file);
      wrongDir = false;
    }
  }

  addInfo(info, 'Game version', gameVersion || 'not detected');
  if(legit)
    addInfo(info, 'Game-cracked version', gameCrackedVersion || 'not detected');
  addInfo(info, 'Crack version', crackVersion || 'not detected');

  return [gameVersion || gameCrackedVersion || crackVersion, legit, wrongDir];
};

// check if file can be ignored - additional files added by repackers, etc.
const canBeIgnored = path => (
  // G4TW's files
  // path.startsWith('#') ||
  // can play without it
  path.startsWith('soundtrack/') ||
  path.startsWith('support/') ||
  // my tools
  path == 'language-changer.exe' ||
  path == 'dlc-toggler.exe' ||
  path == 'dlc-uninstaller.exe' ||
  path == 'dlc.ini' ||
  // from MAC
  path.endsWith('/.ds_store') //||
  // safe to ignore, they should not be there but don't affect the game
  // path.endsWith('.rar') ||
  // path.endsWith('.bak') ||
  // path.endsWith('.lnk') ||
  // path.endsWith('.tmp')
);

// filter files from selected folder and detect game languages
const filterAndDetectLang = files => {
  let info = {}, langs = [];

  for(let file of files) {
    let pathElems = file.webkitRelativePath.split(/\\|\//);
    pathElems.shift();
    let path = pathElems.join('/').toLowerCase();

    if(path.startsWith('__installer/')) {
      let matches = path.match('__installer/gdfbinary_([a-z]{2}_[a-z]{2}).dll');
      if(matches) {
        let lang = matches[1];
        if(typeof LANGUAGE_DICT[lang] != 'undefined')
          langs.push(lang);
      }
      continue;
    }
    else if(canBeIgnored(path))
      continue;

    info[path] = {file: file};
  }

  return [info, langs];
};

const detectLanguages = filesInfo => {
  const langPerFolder = {};
  const allLangCount = Object.values(LANGUAGE_DICT).length;
  const re = new RegExp(
    '^(data/client|delta/(?:[egs]p[0-9]{2}))/strings_('
    + Object.values(LANGUAGE_DICT).join('|')
    + ')\.package$');
  for(let path of Object.keys(filesInfo)) {
    let m = path.match(re);
    if(m) {
      try {
        langPerFolder[m[1]].add(m[2]);
      }
      catch(e) {
        if(e instanceof TypeError) {
          langPerFolder[m[1]] = new Set([m[2]]);
        }
        else
          throw e;
      }
    }
  }

  const languagesSet = new Set();
  for(let langs of Object.values(langPerFolder)) {
    if(langs.size === allLangCount)
      continue;
    langs.forEach(languagesSet.add, languagesSet);
  }
  const reversedLangDict = Object.entries(LANGUAGE_DICT).reduce((ret, entry) => {
    const [key, value] = entry;
    ret[value] = key;
    return ret;
  }, {});

  const languages = [];
  for(let lang of languagesSet) {
    languages.push(reversedLangDict[lang]);
  }
  return languages;
};

// prepare and process info
const initialProcessing = async e => {
  let info = [], folderName, files = e.target.files,
      quickScan = $('#quick-scan').prop('checked');

  if(files.length > 0)
    folderName = files[0].webkitRelativePath.split(/\\|\//, 1)[0];
  else {
    alert('No files found in selected directory.');
    return;
  }

  let [filesInfo, languages] = filterAndDetectLang(files),
      [version, legit, wrongDir] = await getVersion(filesInfo, info),
      ignoredLanguages = [];

  if(version === null) {
    if(
        wrongDir &&
        typeof filesInfo['data/client/clientfullbuild0.package'] == 'undefined' &&
        typeof filesInfo['data/client/clientdeltabuild0.package'] == 'undefined' &&
        typeof filesInfo['data/client/clientfullbuild8.package'] == 'undefined' &&
        typeof filesInfo['data/client/clientdeltabuild8.package'] == 'undefined' &&
        typeof filesInfo['data/simulation/simulationfullbuild0.package'] == 'undefined' &&
        typeof filesInfo['data/simulation/simulationdeltabuild0.package'] == 'undefined') {
      alert('Could not detect game version. Wrong directory selected.');
      return;
    }
    else {
      version = prompt('Could not detect game version. Enter manually (eg. 1.46.18.1020)');
      if(version === null || version.match(/^\d+\.\d+\.\d+\.\d+$/) === null) {
        alert('Incorrect game version.');
        return;
      }
      else {
        addInfo(info, 'Game version (user input)', version);
      }
    }
  }

  // Simplified Chinese was added in 1.60.54, remove it for older versions
  if(olderThan(version, '1.60.54')) {
    delete LANGUAGE_DICT['zh_cn'];
  }

  // starting from 1.68.154 there are no GDFBinary*.dll files, lang detection is different
  if(!olderThan(version, '1.68.154')) {
    languages = detectLanguages(filesInfo);
  }

  if(languages.length == 0 || languages.length == Object.keys(LANGUAGE_DICT).length)
    languages = null;
  else
    for(let lang of Object.keys(LANGUAGE_DICT)) {
      if(languages.indexOf(lang) == -1)
        ignoredLanguages.push(LANGUAGE_DICT[lang]);
    }

  $('#user-input').hide();

  addInfo(info, 'Folder', folderName);
  addInfo(info, 'Languages', languages);

  await validate(version, filesInfo, info, quickScan, legit, ignoredLanguages);
};

await addJS('https://cdn.jsdelivr.net/npm/hash-wasm@4.9.0/dist/md5.umd.min.js', 'sha256-MtseEx7eZnOf4aGwLrvd5j6pzR/+Uc2wqGlZNJeUCI0=');

$('#user-input').append(`  <div class="form-check">
    <input class="form-check-input" type="checkbox" id="quick-scan">
    <label class="form-check-label" for="quick-scan">Quick scan (shows only missing and unknown files)</label>
  </div>
  <div class="form-group">
    <label for="directory-picker">Select your The Sims 4 installation directory (the one with "Data", "Delta", "Game" and other folders inside)</label>
    <input type="file" class="form-control-file" id="directory-picker" webkitdirectory directory>
  </div>`);
$('#report').after(`<div class="template" style="display: none">
  <div class="card">
    <div class="card-header">
      <button class="btn btn-link" type="button" data-toggle="collapse"></button>
    </div>
    <div class="collapse" data-parent="#report">
      <textarea class="form-control" rows="15"></textarea>
    </div>
  </div>
</div>`);

$('#quick-scan').click();

$('#directory-picker').on('change', async e => {
  try {
    await initialProcessing(e);
  }
  catch(err) {
    console.log([err]);
    const lines = [];
    lines.push('Some error occured, try using the newest Firefox or Chrome.');
    lines.push('If the same happens in those browsers report it with this message:');
    lines.push('');
    lines.push(err.name + ': ' + err.message);
    lines.push(err.stack);
    alert(lines.join('\n'));
  }
});

let lastFormatCopied = 'Disqus';

$('#report').on('copy', e => {
  let result = e.target.value;
  lastFormatCopied = e.target.parentElement.id.substr(2);
  if(result.length > 2000 && lastFormatCopied == 'Discord') {
    $('#discord_long').modal('show');
    downloadBlob(new Blob([result]), 'validator_result.yaml');
  }
  e.originalEvent.clipboardData.setData('text/plain', result);
  e.preventDefault();
});

let intervalID = null;
let oldActive = 'BODY';

const checkActive = () => {
  if(
    oldActive !== 'IFRAME'
    && document.activeElement.tagName.toUpperCase() === 'IFRAME'
    && lastFormatCopied !== 'Disqus'
  ) {
    oldActive = 'IFRAME';
    $('#last_format_copied').html(lastFormatCopied);
    $('#bad_format').modal('show');
  }
};

$('#disqus_thread').mouseenter(e => {
  oldActive = document.activeElement.tagName.toUpperCase();
  intervalID = window.setInterval(checkActive, 100); 
});

$('#disqus_thread').mouseleave(e => {
  clearInterval(window.intervalID); 
});

})();