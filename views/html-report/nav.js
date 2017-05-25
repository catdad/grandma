/* eslint-env browser */

var menuItems = document.querySelectorAll('menuitem[x-for]');
var sections = document.querySelectorAll('section[id]');

if (menuItems.length && sections.length) {
    sections = [].slice.call(sections);
    menuItems = [].slice.call(menuItems);

    menuItems.forEach(function(item) {
        item.section = document.querySelector('#' + item.getAttribute('x-for'));

        item.addEventListener('click', function() {
            menuItems.forEach(function(i) {
                if (i === item) {
                    return;
                }

                i.classList.remove('selected');
                i.section.classList.add('hide');
            });

            item.classList.add('selected');
            item.section.classList.remove('hide');
        });
    });
}
