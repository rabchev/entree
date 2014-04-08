/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    async           = require("async"),
    path            = require("path"),
    _               = require("lodash"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        manager = new Manager();
        manager.addConnection("testConn", path.resolve("./mocks/post-provider"), "test connection string");
        async.parallel([
            function (done) {
                manager.addCollection("_posts_1", "testConn", done);
            },
            function (done) {
                manager.addCollection("_posts_2", "testConn", done);
            },
            function (done) {
                manager.addCollection("_posts_3", "testConn", done);
            },
            function (done) {
                manager.addReplicaSet("posts", ["_posts_1", "_posts_2", "_posts_3"], done);
            },
            function (done) {
                manager.configure({ omitModelDoc: true }, done);
            }
        ], function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Insert Item": function (test) {
        test.expect(6);

        manager.posts.insert({_id: 2, name: "Bar", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(item.length, 3);
            test.equal(manager._posts_1.store[2].name, "Bar");
            test.equal(manager._posts_2.store[2].name, "Bar");
            test.equal(manager._posts_3.store[2].name, "Bar");

            test.done();
        });
    },
    "Update Item": function (test) {
        test.expect(6);

        manager.posts.update({_id: 2, $set: { name: "Quxx" }}, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(item.length, 3);
            test.equal(manager._posts_1.store[2].name, "Quxx");
            test.equal(manager._posts_2.store[2].name, "Quxx");
            test.equal(manager._posts_3.store[2].name, "Quxx");

            test.done();
        });
    },
    "Upsert Item": function (test) {
        test.expect(6);

        manager.posts.upsert({_id: 15, name: "Foo", age: 55}, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(item.length, 3);
            test.equal(manager._posts_1.store[15].name, "Foo");
            test.equal(manager._posts_2.store[15].name, "Foo");
            test.equal(manager._posts_3.store[15].name, "Foo");

            test.done();
        });
    },
    "Upsert Existing Item": function (test) {
        test.expect(6);

        manager.posts.upsert({_id: 15, name: "FooGee", age: 55}, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(item.length, 3);
            test.equal(manager._posts_1.store[15].name, "FooGee");
            test.equal(manager._posts_2.store[15].name, "FooGee");
            test.equal(manager._posts_3.store[15].name, "FooGee");

            test.done();
        });
    },
    "Select All": function (test) {
        test.expect(6);

        manager.posts.select(function (err, curr) {
            test.ok(!err);
            test.ok(curr);
            curr.toArray(function (err, arr) {
                test.ok(!err);

                test.equal(arr.length, 2);
                test.equal(arr[0].name, "Quxx");
                test.equal(arr[1].name, "FooGee");

                test.done();
            });
        });
    },
    "Select Without Callback": function (test) {
        test.expect(4);

        var curr = manager.posts.select({ age: 20 });
        test.ok(curr);
        curr.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 1);
            test.equal(arr[0].name, "Quxx");

            test.done();
        });
    },
    "Get One": function (test) {
        test.expect(3);

        manager.posts.get(15, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.name, "FooGee");

            test.done();
        });
    },
    "Delete One": function (test) {
        test.expect(3);

        manager.posts.delete(15, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.length, 3);

            test.done();
        });
    },
    "Rollback": function (test) {
        test.expect(6);

        var item = { _id: 522, name: "Baz", age: 88 };
        manager._posts_3.store[522] = _.clone(item);

        manager.posts.insert(item, function (err, item) {
            test.ok(err);
            test.ok(item);
            test.equal(item.length, 2);
            test.ok(!manager._posts_1.store[522]);
            test.ok(!manager._posts_2.store[522]);
            test.ok(manager._posts_3.store[522]);

            test.done();
        });
    },
    "Different Config": function (test) {
        test.expect(1);

        manager.addReplicaSet("stickers", ["_posts_1", "_posts_2", "_posts_3"], { readStrategy: "round-robin",  writeStrategy: "none" }, function (err) {
            test.ok(!err);

            test.done();
        });
    },
    "Setup-2: Insert Item": function (test) {
        test.expect(6);

        manager.stickers.insert({_id: 44, name: "Blah Blah", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(item.length, 3);
            test.equal(manager._posts_1.store[44].name, "Blah Blah");
            test.equal(manager._posts_2.store[44].name, "Blah Blah");
            test.equal(manager._posts_3.store[44].name, "Blah Blah");

            test.done();
        });
    },
    "Round Robin 1 Call": function (test) {
        test.expect(6);

        manager._posts_1.getCalls = 0;
        manager._posts_2.getCalls = 0;
        manager._posts_3.getCalls = 0;

        manager.stickers.get(44, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.name, "Blah Blah");

            test.equal(manager._posts_1.getCalls, 1);
            test.equal(manager._posts_2.getCalls, 0);
            test.equal(manager._posts_3.getCalls, 0);

            test.done();
        });
    },
    "Round Robin 2 Call": function (test) {
        test.expect(6);

        manager.stickers.get(44, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.name, "Blah Blah");

            test.equal(manager._posts_1.getCalls, 1);
            test.equal(manager._posts_2.getCalls, 1);
            test.equal(manager._posts_3.getCalls, 0);

            test.done();
        });
    },
    "Round Robin 3 Call": function (test) {
        test.expect(6);

        manager.stickers.get(44, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.name, "Blah Blah");

            test.equal(manager._posts_1.getCalls, 1);
            test.equal(manager._posts_2.getCalls, 1);
            test.equal(manager._posts_3.getCalls, 1);

            test.done();
        });
    },
    "Round Robin 4 Call": function (test) {
        test.expect(6);

        manager.stickers.get(44, function (err, res) {
            test.ok(!err);
            test.ok(res);
            test.equal(res.name, "Blah Blah");

            test.equal(manager._posts_1.getCalls, 2);
            test.equal(manager._posts_2.getCalls, 1);
            test.equal(manager._posts_3.getCalls, 1);

            test.done();
        });
    }
});
