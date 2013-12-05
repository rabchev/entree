/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

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
    store3          = new Store("store3"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" });

        provider.use(cache.interception({ store: store1 }, ["get", "delete", "select"]));

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Insert Item": function (test) {
        test.expect(10);
        manager.testProv.insert({_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(manager.testProv.store["1"].name, "Foo");
            test.equal(store1.setCalls, 0);
            test.equal(store1.getCalls, 0);
            test.equal(store1.delCalls, 0);

            test.equal(manager.testProv.insertCalls, 1);
            test.equal(manager.testProv.updateCalls, 0);
            test.equal(manager.testProv.getCalls, 0);
            test.equal(manager.testProv.selectCalls, 0);

            test.done();
        });
    },
    "Get Not Cached Item": function (test) {
        test.expect(10);
        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.equal(item.name, "Foo");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 1);
            test.equal(store1.delCalls, 0);
            test.equal(store1.store["1"].name, "Foo");

            test.equal(manager.testProv.insertCalls, 1);
            test.equal(manager.testProv.updateCalls, 0);
            test.equal(manager.testProv.getCalls, 1);
            test.equal(manager.testProv.selectCalls, 0);

            test.done();
        });
    },
    "Update Item Without Changeing Cached": function (test) {
        test.expect(10);
        manager.testProv.update({_id: 1, name: "Baz", age: 25 }, function (err, item) {
            test.ok(!err);
            test.equal(item.name, "Baz");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 1);
            test.equal(store1.delCalls, 0);
            test.equal(store1.store["1"].name, "Foo");

            test.equal(manager.testProv.insertCalls, 1);
            test.equal(manager.testProv.updateCalls, 1);
            test.equal(manager.testProv.getCalls, 1);
            test.equal(manager.testProv.selectCalls, 0);

            test.done();
        });
    },
    "Get Cached Item": function (test) {
        test.expect(10);
        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.equal(item.name, "Foo");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 2);
            test.equal(store1.delCalls, 0);
            test.equal(manager.testProv.store["1"].name, "Baz");

            test.equal(manager.testProv.insertCalls, 1);
            test.equal(manager.testProv.updateCalls, 1);
            test.equal(manager.testProv.getCalls, 1);
            test.equal(manager.testProv.selectCalls, 0);

            test.done();
        });
    },
    "Add More Items and Select": function (test) {
        test.expect(17);
        var items = [
            {_id: 2, name: "Bar", age: 25 },
            {_id: 3, name: "Qux", age: 20 },
            {_id: 4, name: "Door", age: 30 },
            {_id: 5, name: "Red", age: 25 }
        ];
        manager.testProv.insert(items, function (err, items) {
            test.ok(!err);
            test.ok(items);
            test.equal(manager.testProv.store["2"].name, "Bar");
            test.equal(store1.setCalls, 1);
            test.equal(store1.getCalls, 2);
            test.equal(store1.delCalls, 0);
            manager.testProv.select({ age: 25 }, function (err, res) {
                test.ok(!err);
                res.toArray(function (err, arr) {
                    test.ok(!err);
                    test.ok(arr);
                    test.equal(arr.length, 3);
                    test.equal(store1.setCalls, 2);
                    test.equal(store1.getCalls, 3);
                    test.equal(store1.delCalls, 0);

                    test.equal(manager.testProv.insertCalls, 2);
                    test.equal(manager.testProv.updateCalls, 1);
                    test.equal(manager.testProv.getCalls, 1);
                    test.equal(manager.testProv.selectCalls, 1);

                    test.done();
                });
            });
        });
    },
    "Select from Cache": function (test) {
        test.expect(10);

        manager.testProv.select({ age: 25 }, function (err, res) {
            test.ok(!err);
            test.equal(store1.setCalls, 2);
            test.equal(store1.getCalls, 4);
            test.equal(store1.delCalls, 0);

            test.equal(manager.testProv.insertCalls, 2);
            test.equal(manager.testProv.updateCalls, 1);
            test.equal(manager.testProv.getCalls, 1);
            test.equal(manager.testProv.selectCalls, 1);

            res.toArray(function (err, arr) {
                test.ok(!err);
                test.equal(arr.length, 3);
                test.done();
            });
        });
    },
    "Throw on Select Without Callback": function (test) {
        test.expect(1);
        test.throws(function () {
            manager.testProv.select({age: 25});
        }, "Cache interceptor is asynchronous and therefore it requires a callback function.");
        test.done();
    },
    "Tiered Caches": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "multiCache" });

        provider.use(cache.interception([{ store: store2 }, { store: store3 }]));

        manager.addProvider(provider, "multiCache", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Get Item": function (test) {
        test.expect(25);
        manager.multiCache.insert({_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(manager.multiCache.store["1"].name, "Foo");

            test.equal(store2.setCalls, 1);
            test.equal(store2.getCalls, 0);
            test.equal(store2.delCalls, 0);

            test.equal(store3.setCalls, 1);
            test.equal(store3.getCalls, 0);
            test.equal(store3.delCalls, 0);

            test.equal(manager.multiCache.insertCalls, 1);
            test.equal(manager.multiCache.updateCalls, 0);
            test.equal(manager.multiCache.getCalls, 0);
            test.equal(manager.multiCache.selectCalls, 0);

            manager.multiCache.get(1, function (err, item) {
                test.ok(!err);
                test.equal(item.name, "Foo");
                test.equal(store2.setCalls, 1);
                test.equal(store2.getCalls, 1);
                test.equal(store2.delCalls, 0);

                test.equal(store3.setCalls, 1);
                test.equal(store3.getCalls, 0);
                test.equal(store3.delCalls, 0);

                test.equal(manager.multiCache.insertCalls, 1);
                test.equal(manager.multiCache.updateCalls, 0);
                test.equal(manager.multiCache.getCalls, 0);
                test.equal(manager.multiCache.selectCalls, 0);

                test.done();
            });
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
