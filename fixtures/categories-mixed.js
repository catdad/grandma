function rnd() {
    return Math.random().toString(36).slice(2);
}

var c = 0;
var cats = [rnd(), rnd(), rnd()];

module.exports = {
    test: function(done) {
        this.category(cats[c++ % cats.length]);
        
        setTimeout(done, Math.random() * 10);
    }
};
