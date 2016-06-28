module.exports = {
    test: function(done) {
        setTimeout(function() {
            var err;
            
            if (Date.now() % 2) {
                err = new Error('a bad thing happened');
                err.errorCode = 123;
            }
            
            done(err);
        }, 1);
    }
};
