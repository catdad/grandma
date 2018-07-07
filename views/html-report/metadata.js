/* eslint-env browser */

window.addEventListener('load', function() {
    var meta = document.querySelector('#metadata-section pre');
    var trigger = document.querySelector('[x-for=metadata-section]');

    if (!meta || !trigger) {
        return;
    }

    var text = meta.innerHTML;

    if (text === '') {
        trigger.classList.add('hide');
    }
});
