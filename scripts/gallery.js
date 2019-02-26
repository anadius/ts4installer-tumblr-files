const hexToBase64 = str => {
  return btoa(String.fromCharCode.apply(null,
    str.replace(/\r|\n/g, '').replace(/([\da-fA-F]{2}) ?/g, '0x$1 ').replace(/ +$/, '').split(' '))
  );
};

document.querySelector('#download-form').innerHTML = `<form><fieldset><div class="row">
  <div class="col">
    <input type="text" class="form-control mb-2" id="download-url">
  </div>
  <div class="col-auto">
    <button type="submit" class="btn btn-primary mb-2">Download</button>
  </div>
<div></fieldset></form>`;

document.querySelector('#download-form > form').addEventListener('submit', async e => {
  e.preventDefault();
  let hexid;
  try {
    hexid = document.querySelector('#download-url').value.match(/gallery\/([A-F0-9]{32})(?:$|\?.*)/)[1];
  }
  catch (e) {
    alert('wrong URL');
    return;
  }
  const uuid = hexToBase64(hexid);
  window.open('https://ts4installer.tumblr.com/d?id=' + encodeURIComponent(uuid), '_blank');
});
