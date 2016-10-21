module.exports = {
    test: function(done) {
        // these should all be added
        this.category('one');
        this.category(['two', 'three']);
        this.category(['four'], 'five');
        
        // this will be ignored
        this.category({ i: 'am an object' });
        
        setImmediate(done);
    }
};
