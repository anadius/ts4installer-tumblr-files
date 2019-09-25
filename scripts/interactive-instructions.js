var type_, files = {};
const DATA = {"version":"1.55.108.1020","info":[["base","base-files.xbin","Base game"],["fp01","dlc-fp01-holiday-celebration-pack.xbin","Holiday Celebration Pack"],["gp01","dlc-gp01-outdoor-retreat.xbin","The Sims\u2122 4 Outdoor Retreat"],["ep01","dlc-ep01-get-to-work.xbin","The Sims\u2122 4 Get to Work"],["sp01","dlc-sp01-luxury-party-stuff.xbin","The Sims\u2122 4 Luxury Party Stuff"],["sp02","dlc-sp02-perfect-patio-stuff.xbin","The Sims\u2122 4 Perfect Patio Stuff"],["gp02","dlc-gp02-spa-day.xbin","The Sims\u2122 4 Spa Day"],["sp03","dlc-sp03-cool-kitchen-stuff.xbin","The Sims\u2122 4 Cool Kitchen Stuff"],["sp04","dlc-sp04-spooky-stuff.xbin","The Sims\u2122 4 Spooky Stuff"],["ep02","dlc-ep02-get-together.xbin","The Sims\u2122 4 Get Together"],["sp05","dlc-sp05-movie-hangout-stuff.xbin","The Sims\u2122 4 Movie Hangout Stuff"],["sp06","dlc-sp06-romantic-garden-stuff.xbin","The Sims\u2122 4 Romantic Garden Stuff"],["gp03","dlc-gp03-dine-out.xbin","The Sims\u2122 4 Dine Out"],["sp07","dlc-sp07-kids-room-stuff.xbin","The Sims\u2122 4 Kids Room Stuff"],["sp08","dlc-sp08-backyard-stuff.xbin","The Sims\u2122 4 Backyard Stuff"],["ep03","dlc-ep03-city-living.xbin","The Sims\u2122 4 City Living"],["sp09","dlc-sp09-vintage-glamour-stuff.xbin","The Sims\u2122 4 Vintage Glamour Stuff"],["gp04","dlc-gp04-vampires.xbin","The Sims\u2122 4 Vampires"],["sp10","dlc-sp10-bowling-night-stuff.xbin","The Sims\u2122 4 Bowling Night Stuff"],["gp05","dlc-gp05-parenthood.xbin","The Sims\u2122 4 Parenthood"],["sp11","dlc-sp11-fitness-stuff.xbin","The Sims\u2122 4 Fitness Stuff"],["sp12","dlc-sp12-toddler-stuff.xbin","The Sims\u2122 4 Toddler Stuff"],["ep04","dlc-ep04-cats-and-dogs.xbin","The Sims\u2122 4 Cats & Dogs"],["sp13","dlc-sp13-laundry-day-stuff.xbin","The Sims\u2122 4 Laundry Day Stuff"],["gp06","dlc-gp06-jungle-adventure.xbin","The Sims\u2122 4 Jungle Adventure"],["sp14","dlc-sp14-my-first-pet-stuff.xbin","The Sims\u2122 4 My First Pet Stuff"],["ep05","dlc-ep05-seasons.xbin","The Sims\u2122 4 Seasons"],["ep06","dlc-ep06-get-famous.xbin","The Sims\u2122 4 Get Famous"],["gp07","dlc-gp07-strangerville.xbin","The Sims\u2122 4 StrangerVille"],["ep07","dlc-ep07-island-living.xbin","The Sims\u2122 4 Island Living"],["sp15","dlc-sp15-moschino-stuff.xbin","The Sims\u2122 4 Moschino Stuff"],["gp08","dlc-gp08-realm-of-magic.xbin","The Sims\u2122 4 Realm of Magic"]]};
const style = document.createElement('style');
style.innerHTML = `
  .half {
    width: 50%;
    display: inline-block;
  }
  #interactive label {
    margin-bottom: auto;
  }
`;
document.head.appendChild(style);

document.querySelector('#interactive').innerHTML = `
  <div id="step1">
    <span>Do you have original (bought from Origin) game installed?</span><br>
    <label><input type="radio" name="game" value="original"> Yes</label><br>
    <label><input type="radio" name="game" value="cracked" checked> No</label><br>
    <button id="next" class="btn btn-primary">Next</button>
  </div>
  <div id="step2" style="display:none">
    <div class="half" id="have">
      <span>I have:</span>
    </div><div class="half" id="want">
      <span>I want to have:</span>
    </div>
    <button id="next2" class="btn btn-primary">Next</button>
  </div>
  <div id="step3" style="display:none">
    <span>Downoad from my repack:</span><br>
    <code id="list"></code><br>
    <span id="origin" style="display:none">
      Download <code>ts4-origin-dlc-installer.exe</code> from <a href="http://www.mediafire.com/folder/4te4nglbpt2dt/The_Sims_4_tools" target="_blank">here</a>.
      Update your game in Origin.
    </span>
    <span>Put all downloaded files in one folder and run <code id="installer"></code>.</span>
  </div>
`;

const newCheckbox = (name, value) => {
  let input = document.createElement('input');
  input.type = 'checkbox';
  input.value = value;
  let label = document.createElement('label');
  label.innerHTML = input.outerHTML + ' ' + name;
  return '<br>' + label.outerHTML;
};

document.querySelector('#next').addEventListener('click', () => {
  type_ = document.querySelector('[name="game"]:checked').value;
  document.querySelector('#step1').style.display = 'none';

  let have = document.querySelector('#have');
  let want = document.querySelector('#want');
  for(let i=0, l=DATA.info.length; i < l; ++i) {
    let [value, file, name] = DATA.info[i];
    let checkbox = newCheckbox(name, value);
    have.innerHTML += checkbox;
    want.innerHTML += checkbox;
    files[value] = [file];
    if(i == 0) {
      let version = DATA.version;
      let patch = newCheckbox(`Update ${version}`, 'patch');
      have.innerHTML += patch;
      want.innerHTML += patch;
      files['patch'] = [`no-origin-fix-${version}.rar`];
      if(type_ == 'cracked') {
        files['patch'].push(`patch-${version}-p1.xbin`);
        files['patch'].push(`patch-${version}-p2.xbin`);
      }
    }
  }

  let base = document.querySelector('#want input[value="base"]');
  base.checked = true;
  base.disabled = true;
  let patch = document.querySelector('#want input[value="patch"]');
  patch.checked = true;
  patch.disabled = true;

  document.querySelector('#step2').style.display = 'block';
}, false);

document.querySelector('#step2').addEventListener('click', () => {
  if(type_ == 'original')
    return;
  let patch_needed = false;
  if(document.querySelector(`#have input[value="base"]`).checked) {
    for(let checkbox of document.querySelectorAll('#want input')) {
      if(checkbox.value == 'base' || checkbox.value == 'patch')
        continue;
      if(checkbox.checked && !document.querySelector(`#have input[value="${checkbox.value}"]`).checked) {
        patch_needed = true;
        break;
      }
    }
  }
  else
    patch_needed = true;
  let patch = document.querySelector('#want input[value="patch"]')
  if(patch_needed) {
    patch.checked = true;
    patch.disabled = true;
  }
  else
    patch.disabled = false;
}, false);

document.querySelector('#next2').addEventListener('click', () => {
  document.querySelector('#step2').style.display = 'none';

  let fileList = [];
  for(let checkbox of document.querySelectorAll('#want input')) {
    if(checkbox.value == 'base' && type_ == 'original')
      continue;
    if((checkbox.value == 'patch' && type_ == 'original') || (checkbox.checked && !document.querySelector(`#have input[value="${checkbox.value}"]`).checked))
      fileList = fileList.concat(files[checkbox.value]);
  }
  let installer;
  if(type_ == 'original') {
    installer = 'ts4-origin-dlc-installer.exe';
    document.querySelector('#origin').style.display = 'inline';
  }
  else {
    installer = `_setup-${DATA.version}.exe`;
    fileList.push(installer);
  }
  fileList.sort();

  let list = document.querySelector('#list');
  for(let file of fileList) {
    list.innerHTML += `<span data-file="${file}">${file}</span><br>`;
  }
  document.querySelector('#installer').innerHTML = installer;

  document.querySelector('#step3').style.display = 'block';
}, false);
