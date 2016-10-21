var time = 0;

module.exports = {
    test: function(done) {
        time = (++time) % 5;
        
        this.category(time.toString());
        
        setTimeout(done, time);
    }
};
