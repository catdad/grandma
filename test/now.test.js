/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var now = require('../lib/now.js');

describe('[now]', function() {
    it('is a function', function() {
        expect(now).to.be.a('function');
    });
    
    it('returns a number in milliseconds', function() {
        [now(), now(), now(), now(), now()].reduce(function(a, b) {
            expect(a).to.be.a('number');
            expect(b).to.be.a('number');
            expect(a).to.be.below(b);
            return b;
        });
    });
});

describe('[now:Timer]', function() {
    it('can be called with the new keyword', function() {
        var timer = new now.Timer();
        expect(timer).to.be.instanceof(now.Timer);
    });
    it('can be called without the new keyword', function() {
        var timer = now.Timer();
        expect(timer).to.be.instanceof(now.Timer);
    });
    
    it('exposes its default members', function() {
        var timer = now.Timer();
        
        expect(timer).to.have.property('start').and.to.be.a('function');
        expect(timer).to.have.property('end').and.to.be.a('function');
        expect(timer).to.have.property('report').and.to.be.a('function');
    });
    
    it('exposes extra properties passed in as options', function() {
        var opts = {
            a: 1,
            b: { has: 'props' },
            c: function cFunc() {}
        };
        
        var timer = now.Timer(opts);
        
        expect(timer).to.have.property('a').and.to.equal(opts.a);
        expect(timer).to.have.property('b').and.to.equal(opts.b);
        expect(timer).to.have.property('c').and.to.equal(opts.c);
    });
    
    it('cannot have default members overwritten by options', function() {
        var opts = {
            start: 'string value',
            end: function customEnd() {}
        };
        
        var timer = now.Timer(opts);
        
        expect(timer).to.have.property('start').and.to.equal(now.Timer.prototype.start);
        expect(timer).to.have.property('end').and.to.equal(now.Timer.prototype.end);
    });
    
    it('reports on named timers', function() {
        var timer = now.Timer();
        var NAME = 'llama';
        
        timer.start(NAME);
        timer.end(NAME);
        
        var report = timer.report();
        
        expect(report).to.have.property(NAME)
            .and.to.be.an('object');
        
        var named = report[NAME];
        
        expect(named).to.have.all.keys(['start', 'end', 'duration']);
        expect(named).to.have.property('duration').and.to.be.above(0);
    });
    
    describe('#start', function() {
        var NAME = 'pineapple';
        
        it('returns this', function() {
            var timer = now.Timer();
            expect(timer.start(NAME)).to.equal(timer);
        });
    });
    
    describe('#end', function() {
        var NAME = 'pineapple';
        
        it('returns this when it knows the name', function() {
            var timer = now.Timer();
            timer.start(NAME);
            expect(timer.end(NAME)).to.equal(timer);
        });

        it('returns this when it does not know the name', function() {
            var timer = now.Timer();
            expect(timer.end(NAME)).to.equal(timer);
        });
        
    });
});
