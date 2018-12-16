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

const hexToBase64 = str => {
  return btoa(String.fromCharCode.apply(null,
    str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
  );
};

const toggleDownload = (fieldset, downloading) => {
  if(downloading)
    fieldset.setAttribute('disabled', 'disabled');
  else
    fieldset.removeAttribute('disabled');
};

$('#download-form').append(`<form><fieldset class="row">
  <div class="col">
    <input type="text" class="form-control mb-2" id="download-url">
  </div>
  <div class="col-auto">
    <button type="submit" class="btn btn-primary mb-2">Download</button>
  </div>
</fieldset></form>`);

document.querySelector('#download-form > form').addEventListener('submit', async e => {
  e.preventDefault();
  let hex_id;
  try {
    hex_id = document.querySelector('#download-url').value.match(/gallery\/([A-F0-9]{32})$/)[1];
  }
  catch (e) {
    alert('wrong URL');
    return;
  }
  const fieldset = document.querySelector('#download-form > form > fieldset');
  toggleDownload(fieldset, true);
  await realDownload(hexToBase64(hex_id), window.debug);
  toggleDownload(fieldset, false);
});
