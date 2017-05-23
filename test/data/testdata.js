/* eslint-disable quotes, key-spacing, comma-spacing, max-len */

var _ = require('lodash');

// Test data using rate mode
var TESTDATA = [
    {"type":"header","epoch":1460127721611,"duration":30000,"rate":20,"targetCount":600,"name":"testname"},
    {"type":"report","report":{"fullTest":{"start":0,"end":19.801774,"duration":19.801774,"status":"success"},"one":{"start":0.14821399999999585,"end":2.897864999999996,"duration":2.749651,"status":"success"},"two":{"start":0.45399899999999604,"end":6.853753000000005,"duration":6.399754000000009,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":47.191123999999995,"end":61.882996999999996,"duration":14.691873000000001,"status":"success"},"one":{"start":47.213159999999995,"end":49.951642,"duration":2.7384820000000047,"status":"success"},"two":{"start":47.56996,"end":51.722057,"duration":4.152096999999998,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":97.46002200000001,"end":111.861504,"duration":14.401481999999987,"status":"success"},"one":{"start":97.46877600000002,"end":99.933471,"duration":2.4646949999999777,"status":"success"},"two":{"start":97.493529,"end":101.74916300000001,"duration":4.255634000000015,"status":"success"}},"id":0}
];

var TESTDATACATEGORIES = TESTDATA.map(function(data, idx) {
    if (data.type !== 'report') {
        return data;
    }
    
    return _.merge(_.cloneDeep(data), {
        categories: [(idx % 3).toString()]
    });
});

var TESTDATA2 = [
    {"type":"header","epoch":1460127721611,"duration":30000,"rate":20,"targetCount":600,"name":"testname"},
    {"type":"report","report":{"fullTest":{"start":0,"end":50,"duration":50,"status":"success"},"one":{"start":0.14821399999999585,"end":2.897864999999996,"duration":2.749651,"status":"success"},"two":{"start":0.45399899999999604,"end":6.853753000000005,"duration":6.399754000000009,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":50,"end":110,"duration":60,"status":"success"},"one":{"start":47.213159999999995,"end":49.951642,"duration":2.7384820000000047,"status":"success"},"two":{"start":47.56996,"end":51.722057,"duration":4.152096999999998,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":110,"end":180,"duration":70,"status":"success"},"one":{"start":97.46877600000002,"end":99.933471,"duration":2.4646949999999777,"status":"success"},"two":{"start":97.493529,"end":101.74916300000001,"duration":4.255634000000015,"status":"success"}},"id":0}
];

var TESTDATA_OUTLIER = [
    {"type":"header","epoch":1460127721611,"duration":30000,"rate":20,"targetCount":600,"name":"testname"},
    {"type":"report","report":{"fullTest":{"start":0,"end":15,"duration":15,"status":"success"},"one":{"start":0.14821399999999585,"end":2.897864999999996,"duration":2.749651,"status":"success"},"two":{"start":0.45399899999999604,"end":6.853753000000005,"duration":6.399754000000009,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":15,"end":35,"duration":20,"status":"success"},"one":{"start":47.213159999999995,"end":49.951642,"duration":2.7384820000000047,"status":"success"},"two":{"start":47.56996,"end":51.722057,"duration":4.152096999999998,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":110,"end":240,"duration":130,"status":"success"},"one":{"start":97.46877600000002,"end":99.933471,"duration":2.4646949999999777,"status":"success"},"two":{"start":97.493529,"end":101.74916300000001,"duration":4.255634000000015,"status":"success"}},"id":0}
];

// Test data using concurrent mode with errors
var TESTERRDATA = [
    {"type":"header","epoch":1463604033635,"duration":120,"rate":null,"concurrent":3,"targetCount":null,"name":"errname"},
    {"type":"report","report":{"fullTest":{"start":0,"end":1.6533409999999993,"duration":1.6533409999999993,"status":"failure","errorCode":123}},"id":0},
    {"type":"report","report":{"fullTest":{"start":0.3569969999999998,"end":3.7886290000000002,"duration":3.4316320000000005,"status":"failure","errorCode":123}},"id":0},
    {"type":"report","report":{"fullTest":{"start":0.5265699999999995,"end":4.111711,"duration":3.585141,"status":"failure","errorCode":456}},"id":0},
    {"type":"report","report":{"fullTest":{"start":8.090886999999999,"end":9.512626999999998,"duration":1.4217399999999998,"status":"failure","errorCode":456}},"id":0},
    {"type":"report","report":{"fullTest":{"start":8.472428,"end":9.606784999999999,"duration":1.1343569999999978,"status":"failure","errorCode":789}},"id":0},
    {"type":"report","report":{"fullTest":{"start":8.656281,"end":9.667475,"duration":1.0111939999999997,"status":"failure","errorCode":123}},"id":0},
    {"type":"report","report":{"fullTest":{"start":10.741143000000001,"end":10.833962,"duration":0.09281899999999865,"status":"success"}},"id":0}
];

// Test data using custom timers with non-js variable names
var TESTDATA_FUNNY_METRICS = [
    {"type":"header","epoch":1495566818976,"duration":1000,"rate":null,"concurrent":1,"targetCount":null,"name":"metrics"},
    {"type":"report","report":{"fullTest":{"start":8.235657,"end":28.625419,"duration":20.389762,"status":"success"},"one-timer":{"start":8.532084,"end":12.493397,"duration":3.9613130000000005,"status":"success"},"two-timer#()":{"start":8.943821,"end":15.493889,"duration":6.550068,"status":"success"}},"categories":[],"id":0},
    {"type":"report","report":{"fullTest":{"start":32.958926,"end":51.453005,"duration":18.494079,"status":"success"},"one-timer":{"start":32.986697,"end":37.431893,"duration":4.445196000000003,"status":"success"},"two-timer#()":{"start":33.022921,"end":39.429001,"duration":6.406080000000003,"status":"success"}},"categories":[],"id":0},
    {"type":"report","report":{"fullTest":{"start":53.898376,"end":69.449618,"duration":15.551242000000002,"status":"success"},"one-timer":{"start":53.923732,"end":56.514298,"duration":2.5905659999999955,"status":"success"},"two-timer#()":{"start":54.371995,"end":59.433288,"duration":5.061292999999999,"status":"success"}},"categories":[],"id":0},
    {"type":"report","report":{"fullTest":{"start":72.847962,"end":91.556966,"duration":18.709004000000007,"status":"success"},"one-timer":{"start":72.874224,"end":76.463646,"duration":3.589421999999999,"status":"success"},"two-timer#()":{"start":72.899279,"end":79.465345,"duration":6.566065999999992,"status":"success"}},"categories":[],"id":0}
];

var TESTRESULTS = {
    "info": {
        "count": 3,
        "targetCount": 600,
        "duration": 30000,
        "rate": 20,
        "concurrent": null,
        "name": "testname"
    },
    "breakdown": {
        "successes": 3
    },
    "latencies": {
        "fullTest": {
            "25": 14.401481999999987,
            "50": 14.691873000000001,
            "75": 19.801774,
            "95": 19.801774,
            "99": 19.801774,
            "max": 19.801774,
            "mean": 16.29837633333333,
            "median": 14.691873000000001,
            "min": 14.401481999999987
        },
        "one": {
            "25": 2.4646949999999777,
            "50": 2.7384820000000047,
            "75": 2.749651,
            "95": 2.749651,
            "99": 2.749651,
            "max": 2.749651,
            "mean": 2.6509426666666607,
            "median": 2.7384820000000047,
            "min": 2.4646949999999777
        },
        "two": {
            "25": 4.152096999999998,
            "50": 4.255634000000015,
            "75": 6.399754000000009,
            "95": 6.399754000000009,
            "99": 6.399754000000009,
            "max": 6.399754000000009,
            "mean": 4.93582833333334,
            "median": 4.255634000000015,
            "min": 4.152096999999998
        }
    },
    "categories": {}
};

var TESTERRRESULTS = {
    "info": {
        "count": 7,
        "targetCount": 0,
        "duration": 120,
        "rate": null,
        "concurrent": 3,
        "name": "errname"
    },
    "breakdown": {
        "successes": 1,
        "failures": {
            "123": 3,
            "456": 2,
            "789": 1
        }
    },
    "latencies": {
        "fullTest": {
            "25": 1.0111939999999997,
            "50": 1.4217399999999998,
            "75": 3.4316320000000005,
            "95": 3.585141,
            "99": 3.585141,
            "max": 3.585141,
            "mean": 1.761460571428571,
            "median": 1.4217399999999998,
            "min": 0.09281899999999865
        }
    },
    "categories": {}
};

_.forEach({
    test: TESTDATA,
    testcategories: TESTDATACATEGORIES,
    test2: TESTDATA2,
    test_outlier: TESTDATA_OUTLIER,
    test_funny_metrics: TESTDATA_FUNNY_METRICS,
    testerr: TESTERRDATA,
    results: TESTRESULTS,
    resultserr: TESTERRRESULTS
}, function(val, name) {
    Object.defineProperty(module.exports, name, {
        enumerable: true,
        get: function() {
            // always return copies, just in case a
            // rogue test tries to modify the data
            return _.cloneDeep(val);
        }
    });
});
