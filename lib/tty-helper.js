var tty = require('tty');

var window = { width: 75 };

function getWidth() {
    var isatty = tty.isatty(1) && tty.isatty(2);

    if (isatty) {
        window.width = process.stdout.getWindowSize ?
            process.stdout.getWindowSize(1)[0] :
            tty.getWindowSize()[1];
    }

    if (process.env.FORCE_TTY_WIDTH && +process.env.FORCE_TTY_WIDTH) {
        window.width = parseInt(process.env.FORCE_TTY_WIDTH);
    }
    
    return window.width;
}

Object.defineProperty(module.exports, 'width', {
    enumerable: true,
    configurable: false,
    get: getWidth
});
