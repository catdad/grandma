var count = 0;

module.exports = {
    test: function(done) {
        var n = count % 3;
        
        for (var i = 0; i < n; i++) {
            this.start('met' + i);
            this.end('met' + i);
        }
        
        count += 1;
        
        done();
    }
};
