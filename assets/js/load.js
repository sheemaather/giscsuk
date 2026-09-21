// load.js

function loadHTML(file, elementID){
  fetch(file)
    .then(res => res.text())
    .then(data => {
      document.getElementById(elementID).innerHTML = data;
    })
    .catch(err => console.log('Error: ', err));
}

// Page load hote hi call ho jaye
loadHTML('topbar.html', 'topbar');
loadHTML('footer.html', 'footer');