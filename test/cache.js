/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";
debugger;
function Store(name) {
    this.name = name;
    this.getCalls = 0;
    this.setCalls = 0;
    this.delCalls = 0;
    this.store = {};
}

Store.prototype.get = function (key, callback) {
    this.getCalls++;
    callback(null, this.store[key]);
};

Store.prototype.del = function (key, callback) {
    this.delCalls++;
    delete this.store[key];
    if (callback) {
        callback();
    }
};

Store.prototype.set = function (key, val, callback) {
    this.setCalls++;
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

        provider.use(cache.interception(store1, ["get", "delete", "select"]));

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Insert Item": function (test) {
        test.expect(6);
        manager.testProv.insert({_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(manager.testProv.store["1"].name, "Foo");
            test.equal(store1.setCalls, 0);
            test.equal(store1.getCalls, 0);
            test.equal(store1.delCalls, 0);
            test.done();
        });
    },
    "Get Not Cached Item": function (test) {
        test.expect(5);
        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.equal(item.name, "Foo");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 1);
            test.equal(store1.delCalls, 0);
            test.equal(store1.store["1"].name, "Foo");
            test.done();
        });
    },
    "Update Item Without Changeing Cached": function (test) {
        test.expect(5);
        manager.testProv.update({_id: 1, name: "Baz", age: 25 }, function (err, item) {
            test.ok(!err);
            test.equal(item.name, "Baz");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 1);
            test.equal(store1.delCalls, 0);
            test.equal(store1.store["1"].name, "Foo");
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
