/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    Provider        = require("./mocks/post-provider"),
    autofields      = require("../lib/interceptors/autofields"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" });

        provider.use(autofields.interception());

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Insert Item With String Context": function (test) {
        test.expect(7);
        manager.testProv.insert("bob", {_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.ok(item._createdAt instanceof Date);
            test.equal(item._createdBy, "bob");
            test.ok(item._lastModified instanceof Date);
            test.equal(item._modifiedBy, "bob");
            test.equal(item._version, 1);

            test.done();
        });
    },
    "Insert Item Without Context": function (test) {
        test.expect(7);
        manager.testProv.insert({_id: 2, name: "Bar", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.ok(item._createdAt instanceof Date);
            test.equal(item._createdBy, null);
            test.ok(item._lastModified instanceof Date);
            test.equal(item._modifiedBy, null);
            test.equal(item._version, 1);

            test.done();
        });
    },
    "Insert Item With Object Context": function (test) {
        test.expect(7);
        manager.testProv.update({ user: { name: "john" }}, {_id: 2, $set: { age: 22 }}, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.ok(item._createdAt instanceof Date);
            test.equal(item._createdBy, null);
            test.ok(item._lastModified instanceof Date);
            test.equal(item._modifiedBy, "john");
            test.equal(item._version, 2);

            test.done();
        });
    },
    "Fixture Tear Down": function (test) {
        test.expect(1);
        manager.dispose(function (err) {
            test.ok(!err);
            test.done();
        });
    }
});
