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
    "Update Item With Object Context": function (test) {
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
    "Select and Update": function (test) {
        test.expect(13);
        var context = manager.createContext({ user: { name: "john" }});
        manager.testProv.select(context).update({ $set: { age: 55 }}, function (err, res) {
            test.ok(!err);
            test.ok(res);

            manager.testProv.select().toArray(function (err, arr) {
                test.ok(!err);
                test.ok(arr);
                test.equal(arr.length, 2);
                test.equal(arr[0].age, 55);
                test.equal(arr[0]._createdBy, "bob");
                test.equal(arr[0]._modifiedBy, "john");
                test.equal(arr[0]._version, 2);
                test.equal(arr[1].age, 55);
                test.equal(arr[1]._createdBy, null);
                test.equal(arr[1]._modifiedBy, "john");
                test.equal(arr[1]._version, 3);
                test.done();
            });
        });
    },
    "Select and Update With Callback": function (test) {
        test.expect(15);
        var context = manager.createContext({ user: "susan" });
        manager.testProv.select(context, function (err, cur) {
            test.ok(!err);
            test.ok(cur);
            cur.update({ $set: { age: 66 }}, function (err, res) {
                test.ok(!err);
                test.ok(res);

                manager.testProv.select().toArray(function (err, arr) {
                    test.ok(!err);
                    test.ok(arr);
                    test.equal(arr.length, 2);
                    test.equal(arr[0].age, 66);
                    test.equal(arr[0]._createdBy, "bob");
                    test.equal(arr[0]._modifiedBy, "susan");
                    test.equal(arr[0]._version, 3);
                    test.equal(arr[1].age, 66);
                    test.equal(arr[1]._createdBy, null);
                    test.equal(arr[1]._modifiedBy, "susan");
                    test.equal(arr[1]._version, 4);
                    test.done();
                });
            });
        });
    },
    "Upsert New Item With $set": function (test) {
        test.expect(7);
        manager.testProv.upsert("bob", {_id: 3, $set: { name: "Baz", age: 55 }}, function (err, item) {
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
    "Upsert Existing Item With $set": function (test) {
        test.expect(7);
        manager.testProv.upsert("john", {_id: 3, $set: { name: "Quux", age: 65 }}, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.ok(item._createdAt instanceof Date);
            test.equal(item._createdBy, "bob");
            test.ok(item._lastModified instanceof Date);
            test.equal(item._modifiedBy, "john");
            test.equal(item._version, 2);

            test.done();
        });
    },
    "Upsert New Item Without $set": function (test) {
        test.expect(7);
        manager.testProv.upsert("bob", {_id: 4, name: "Bluba", age: 125 }, function (err, item) {
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
    "Upsert Existing Item Without $set": function (test) {
        test.expect(7);
        manager.testProv.upsert("john", {_id: 4, name: "Bluba Lu", age: 165 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.ok(item._createdAt instanceof Date);
            test.equal(item._createdBy, "john");
            test.ok(item._lastModified instanceof Date);
            test.equal(item._modifiedBy, "john");
            test.equal(item._version, 1);

            test.done();
        });
    },
    "Assert Upserted Values": function (test) {
        test.expect(8);

        var itm1 = manager.testProv.store[3],
            itm2 = manager.testProv.store[4];

        test.ok(itm1);
        test.ok(itm2);

        test.equal(itm1.name, "Quux");
        test.equal(itm2.name, "Bluba Lu");
        test.equal(itm1._createdBy, "bob");
        test.equal(itm2._createdBy, "john");
        test.equal(itm1._modifiedBy, "john");
        test.equal(itm2._modifiedBy, "john");

        test.done();
    },
    "Fixture Tear Down": function (test) {
        test.expect(1);
        manager.dispose(function (err) {
            test.ok(!err);
            test.done();
        });
    }
});
