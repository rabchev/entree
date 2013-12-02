/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

function Store(name) {
    this.name = name;
    this.getCalled = 0;
    this.setCalled = 0;
    this.delCalled = 0;
    this.store = [];
}

Store.prototype.get = function (key, callback) {
    this.getCalled++;
    callback(null, this.store[key]);
};

Store.prototype.del = function (key, callback) {
    this.delCalled++;
    delete this.store[key];
    if (callback) {
        callback();
    }
};

Store.prototype.set = function (key, val, callback) {
    this.setCalled++;
    this.store[key] = val;
    if (callback) {
        callback();
    }
};

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    Provider        = require("./mocks/post-provider"),
    cache           = require("../lib/interceptors/cache"),
    store1          = new Store("store1"),
    store2          = new Store("store2"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" });

        provider.use(cache.interception(store1, ["get", "delete"]));

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
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
