/* eslint-env browser */

window.addEventListener('load', function() {
    var menuItems = document.querySelectorAll('menuitem[x-for]');
    var sections = document.querySelectorAll('section[id]');

    function disableAllExcept(item) {
        return function(i) {
            if (i === item) {
                return;
            }

            i.classList.remove('selected');
            i.section.classList.add('hide');
        };
    }

    function initItem(item) {
        var initName = item.getAttribute('x-init');

        if (initName && window[initName]) {
            window[initName]();
        }
    }

    if (menuItems.length && sections.length) {
        sections = [].slice.call(sections);
        menuItems = [].slice.call(menuItems);

        menuItems.forEach(function(item) {
            item.section = document.querySelector('#' + item.getAttribute('x-for'));

            item.addEventListener('click', function() {
                menuItems.forEach(disableAllExcept(item));

                item.classList.add('selected');
                item.section.classList.remove('hide');

                initItem(item);
            });

            // initialize the item that is selected by default
            if (item.classList.contains('selected')) {
                initItem(item);
            }
        });
    }
});
