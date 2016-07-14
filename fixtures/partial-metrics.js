module.exports = {
    test: function(done) {
        var that = this;
        
        this.start('one');
        this.start('two');
		
        setTimeout(function() {
            that.end('one');
			
            done();
        }, 10);
    }
};
