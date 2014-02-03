/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    interceptor     = require("./mocks/interceptor"),
    path            = require("path"),
    _               = require("lodash"),
    manager;

module.exports = testCase({
    "Initialize Manager": function (test) {
        test.expect(11);

        var fsPath = path.resolve(process.cwd(), "./data");
        manager = new Manager();
        manager.init(function (err) {
            test.ok(!err);
            test.equal(manager.collections.length, 5);
            test.ok(manager.config);
            test.ok(manager.blogs);
            test.ok(manager.posts);
            test.ok(manager.comments);
            test.ok(manager.users);
            test.equal(manager.blogs.dir, path.join(fsPath, "blogs"));
            test.equal(manager.posts.dir, path.join(fsPath, "posts"));
            test.equal(manager.comments.options.connStr, "mongodb://localhost/entreeTest");
            test.equal(manager.users.dir, path.join(fsPath, "users"));
            test.done();
        });
    },
    "Add Pdrovider": function (test) {
        test.expect(5);

        var Provider    = require("./mocks/post-provider"),
            options     = { connStr: "test connection string" },
            schema      = { __collName: "test", identifier: "_id" },
            provider    = new Provider(options, schema);

        manager.addProvider(provider, "myProvider", function (err) {
            test.ok(!err);
            test.ok(manager.myProvider);
            test.equal(manager.myProvider.options.connStr, "test connection string");
            test.equal(manager.collections.length, 6);
            test.ok(_.find(manager.collections, function (itm) { return itm.name === "myProvider"; }));
            test.done();
        });
    },
    "Remove Pdrovider": function (test) {
        test.expect(3);

        manager.removeCollection("myProvider", function (err) {
            test.ok(!err);
            test.ok(!manager.myProvider);
            test.equal(manager.collections.length, 5);
            test.done();
        });
    },
    "New Manger Mising Config Params": function (test) {
        test.expect(2);

        var mgr = new Manager({ config: {}});
        mgr.init(function (err) {
            test.ok(err);
            test.equals(err.code, "MISSING_CONF_PARAMS");
            test.done();
        });
    },
    "New Manger Invalid Model Doc": function (test) {
        test.expect(2);

        var mgr = new Manager(),
            opts = { config: { modelDocument: "non-existent" }};

        mgr.init(opts, function (err) {
            test.ok(err);
            test.equals(err.code, "NO_CONF_FILE");
            test.done();
        });
    },
    "Dispose Manager": function (test) {
        test.expect(0);
        manager.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    },
    "API - simple insert": function (test) {
        test.expect(3);
        manager = new Manager();
        manager.addCollection("users");

        manager.users.insert([
            { name: "user 1", age: 15 },
            { name: "user 2", age: 16 },
            { name: "user 3", age: 16 },
            { name: "user 4", age: 18 },
            { name: "user 5", age: 26 },
            { name: "user 6", age: 12 },
            { name: "user 7", age: 22 }
        ], function (err, res) {
            test.ok(!err);
            test.equal(res.length, 7);
            test.ok(res[0]._id);
            test.done();
        });
    },
    "API - simple select": function (test) {
        test.expect(4);
        manager.users.select({ age: 16 }, function (err, currsor) {
            test.ok(!err);
            currsor.toArray(function (err, res) {
                test.ok(!err);
                test.equal(res.length, 2);
                test.equal(res[0].name, "user 2");
                test.done();
            });
        });
    },
    "API - simple delete": function (test) {
        test.expect(2);
        manager.users.select(function (err, currsor) {
            test.ok(!err);
            currsor.delete(function (err, res) {
                test.ok(!err);
                test.done();
            });
        });
    },
    "API - fluent add collections": function (test) {
        test.expect(3);
        manager
            .addConnection("mongodb-new", "mongodb", "mongodb://localhost/node1")
            .setCollections("settings")
            .setConnection("mongodb-new")
            .use(interceptor.logging)
            .addCollection("prefs")
            .setConnection("mongodb-new")
            .done(function (err) {
                test.ok(!err);
                test.ok(manager.settings);
                test.ok(manager.prefs);
                test.done();
            });
    },
    "Dispose Manager 2": function (test) {
        test.expect(0);
        manager.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    },
});
