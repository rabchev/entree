/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    _               = require("lodash"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(2);

        manager = new Manager();
        manager.init(function (err) {
            test.ok(!err);
            test.equal(_.keys(manager.providers).length, 4);
            test.done();
        });
    },
    "Fixture Tear Down": function (test) {
        test.expect(0);
        manager.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    }
});
