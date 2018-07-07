/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var _ = require('lodash');
var Enum = require('../lib/enums.js');

var expect = require('chai').expect;

describe('[enums]', function() {
    var ENUM = {
        apple: 'fruit',
        carrot: 'vegetable'
    };

    it('creates an enums object', function() {
        var e = Enum(ENUM);

        expect(e).to.be.an('object');
        expect(e).to.have.all.keys(_.keys(ENUM));
        expect(e).to.not.equal(ENUM);
    });

    it('can be used to get values', function() {
        var e = Enum(ENUM);

        _.forEach(ENUM, function(val, key) {
            expect(e).to.have.property(key).and.to.equal(val);
        });
    });

    describe('#fromValue', function() {
        it('is a non-enumerable method', function() {
            var e = Enum(ENUM);

            expect(e).to.have.property('fromValue').and.to.be.a('function');
            expect(Object.keys(e)).to.not.contain('fromValue');
        });

        it('returns the key using a value', function() {
            var e = Enum(ENUM);

            _.forEach(function(val, key) {
                expect(e.fromValue(val)).to.equal(key);
            });
        });

        it('returns undefined if the value does not exist', function() {
            var e = Enum(ENUM);

            expect(e.fromValue('apple' + Math.random())).to.equal(void 0);
        });

        it('returns undefined if more than one key have the same value', function() {
            var clone = _.merge({
                peach: 'fruit'
            }, ENUM);

            var e = Enum(clone);

            expect(e.fromValue('fruit')).to.equal(void 0);

        });
    });
});
