/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, multistr: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    async           = require("async"),
    path            = require("path"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(3);

        manager = new Manager();
        manager.addConnection("testConn", path.resolve("./mocks/post-provider"), "test connection string");
        async.parallel([
            function (done) {
                manager.addCollection("users", "testConn", function (err) {
                    test.ok(!err);
                    done(err);
                });
            },
            function (done) {
                manager.addCollection("posts", "testConn", function (err) {
                    test.ok(!err);
                    done(err);
                });
            },
            function (done) {
                manager.addCollection("comments", "testConn", function (err) {
                    test.ok(!err);
                    done(err);
                });
            },
            function (done) {
                manager.configure({ omitModelDoc: true }, done);
            }
        ], function () {
            test.done();
        });
    },
    "Insert With Transaction": function (test) {
        test.expect(9);

        manager.transaction.set(["posts", "comments"], function (err, posts, comments, trans) {
            test.ok(!err);
            test.ok(posts);
            test.ok(comments);
            test.ok(trans);

            posts.insert({ _id: 1, title: "First Post", content: "In aliqua quibusdam. De amet est legam, ea quorum laboris o minim te te anim \
                          eiusmod, ne velit probant efflorescere, sint iis quibusdam ubi varias expetendis \
                          ad mentitum est expetendis noster irure si quae ita ita aliqua praesentibus." });

            posts.insert({ _id: 2, title: "Second Post", content: "minim cupidatat ex magna ne quibusdam irure eram quibusdam doctrina" });

            comments.insert({_id: 1, title: "First Comment", content: "domesticarum se eruditionem veniam offendit veniam dolor ne legam offendit \
                             instituendarum ea consectetur o nam iudicem enim cohaerescant cohaerescant hic \
                             quamquam probant quis iis possumus anim coniunctione pariatur mentitum \
                             fidelissimae" });

            comments.insert([{ title: "com1" }, { title: "com2" }, { title: "com3" }]);

            trans.commit(function (err, res) {
                test.ok(!err);
                test.equal(res.length, 4);
                var keys = Object.keys(manager.comments.store);
                test.equal(keys.length, 4);
                test.equal(manager.comments.store[1].title, "First Comment");
                test.equal(manager.comments.store[keys[3]].title, "com3");

                test.done();
            });
        });
    },
    "Update Selected With Transaction": function (test) {
        test.expect(6);

        manager.transaction.set(["comments"], function (err, comments, trans) {
            test.ok(!err);
            test.ok(comments);
            test.ok(trans);

            var selected = comments.select({ title: { $regex: "^com" } });
            selected.update({ $set: { foo: "bar" } });
            trans.commit(function (err, res) {
                test.ok(!err);
                test.equal(res, 3);
                var keys = Object.keys(manager.comments.store);
                test.equal(manager.comments.store[keys[3]].foo, "bar");

                test.done();
            });
        });
    },
    "Fail on Get Old Data": function (test) {
        test.expect(16);

        var prov    = manager.comments,
            store   = prov.store,
            keys    = Object.keys(store);

        prov.insertCalls = 0;
        prov.upsertCalls = 0;
        prov.getCalls = 0;
        prov.updateCalls = 0;
        prov.selectCalls = 0;
        prov.deleteCalls = 0;

        manager.transaction.set(function (err, trans) {
            test.ok(!err);

            trans.comments.insert({ _id: 2, title: "Foobar" });
            trans.comments.insert({ _id: 3, title: "Quux" });
            trans.comments.update({ _id: 1, $set: { title: "Updated Comment" }});
            trans.comments.delete(keys[1]);
            trans.comments.update({ _id: "foo", $set: { title: "No Such Comment" }});

            test.equal(Object.keys(store).length, 4);

            test.equal(prov.insertCalls, 0);
            test.equal(prov.updateCalls, 0);
            test.equal(prov.deleteCalls, 0);
            test.equal(prov.getCalls, 0);

            trans.commit(function (err, res) {
                test.ok(err);
                test.ok(!res);
                test.equal(Object.keys(store).length, 4);
                test.equal(store[1].title, "First Comment");
                test.ok(!store[2]);
                test.ok(store[keys[1]]);

                test.equal(prov.insertCalls, 0);
                test.equal(prov.updateCalls, 0);
                test.equal(prov.deleteCalls, 0);
                test.equal(prov.getCalls, 3);

                test.done();
            });
        });
    },
    "Rollback": function (test) {
        test.expect(16);

        var prov    = manager.comments,
            store   = prov.store,
            keys    = Object.keys(store),
            orgFn   = prov.update,
            once;

        prov.update = function (context, item, callback) {
            if (!once && item._id === keys[2]) {
                once = true;
                callback(new Error("Update denied."));
            } else {
                orgFn.call(prov, context, item, callback);
            }
        };

        prov.insertCalls = 0;
        prov.upsertCalls = 0;
        prov.getCalls = 0;
        prov.updateCalls = 0;
        prov.selectCalls = 0;
        prov.deleteCalls = 0;

        manager.transaction.set(function (err, trans) {
            test.ok(!err);

            trans.comments.insert({ _id: 2, title: "Foobar" });
            trans.comments.insert({ _id: 3, title: "Quux" });
            trans.comments.update({ _id: 1, $set: { title: "Updated Comment" }});
            trans.comments.delete(keys[1]);
            trans.comments.update({ _id: keys[2], $set: { title: "com2 update not allowed!" }});

            test.equal(Object.keys(store).length, 4);

            test.equal(prov.insertCalls, 0);
            test.equal(prov.updateCalls, 0);
            test.equal(prov.deleteCalls, 0);
            test.equal(prov.getCalls, 0);

            trans.commit(function (err, res) {
                test.ok(err);
                test.ok(res);
                test.equal(Object.keys(store).length, 4);
                test.equal(store[1].title, "First Comment");
                test.ok(!store[2]);
                test.ok(store[keys[1]]);

                test.equal(prov.insertCalls, 3);
                test.equal(prov.updateCalls, 3);
                test.equal(prov.deleteCalls, 3);
                test.equal(prov.getCalls, 3);

                prov.update = orgFn;
                test.done();
            });
        });
    },
    "Rollback Select": function (test) {
        test.expect(4);

        var prov    = manager.comments,
            store   = prov.store,
            keys    = Object.keys(store),
            orgFn   = prov._update,
            once;

        prov._update = function (item, callback) {
            if (!once && item._id === keys[2]) {
                once = true;
                callback(new Error("Update denied."));
            } else {
                orgFn.call(prov, item, callback);
            }
        };

        prov.insertCalls = 0;
        prov.upsertCalls = 0;
        prov.getCalls = 0;
        prov.updateCalls = 0;
        prov.selectCalls = 0;
        prov.deleteCalls = 0;

        manager.transaction.set(["comments"], function (err, comments, trans) {
            test.ok(!err);

            var selected = comments.select({ title: { $regex: "^com" } });
            selected.update({ $set: { foo: "quxbaz" } });
            trans.commit(function (err, res) {
                test.ok(err);
                test.equal(res[0].length, 3);
                var keys = Object.keys(manager.comments.store);
                test.equal(manager.comments.store[keys[3]].foo, "bar");

                prov.update = orgFn;
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
