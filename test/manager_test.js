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
            test.equal(manager.collections.length, 6);
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
            test.equal(manager.collections.length, 7);
            test.ok(_.find(manager.collections, function (itm) { return itm.name === "myProvider"; }));
            test.done();
        });
    },
    "Remove Pdrovider": function (test) {
        test.expect(3);

        manager.removeCollection("myProvider", function (err) {
            test.ok(!err);
            test.ok(!manager.myProvider);
            test.equal(manager.collections.length, 6);
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
    "AddCollection args - set schema by name": function (test) {
        test.expect(2);
        manager.schema.foo = { name: "foo" };
        manager.addCollection("foo", null, null, "foo", function (err) {
            test.ok(manager.foo);
            test.ok(manager.collections.some(function (el) { return el.name === "foo" && el.schema.name === "foo"; }));
            test.done();
        });
    },
    "AddCollection args - set schema skip args": function (test) {
        test.expect(2);
        manager.schema.bar = { name: "bar" };
        manager.addCollection("bars", "mongodb-new", "bar", function (err) {
            test.ok(manager.bars);
            test.ok(manager.collections.some(function (el) { return el.name === "bars" && el.schema.name === "bar"; }));
            test.done();
        });
    },
    "AddCollection args - set interceptors": function (test) {
        test.expect(2);
        manager.addCollection("bazs", [interceptor.logging], function (err) {
            test.ok(manager.bazs);
            test.ok(manager.collections.some(function (el) {
                return el.name === "bazs" && !el.schema.name && el.schema.__collName === "bazs" && el._stack.length === 1;
            }));
            test.done();
        });
    },
    "AddCollection args - set interceptors and schema": function (test) {
        test.expect(2);
        manager.schema.qux = { name: "qux" };
        manager.addCollection("quxs", [], "qux", function (err) {
            test.ok(manager.quxs);
            test.ok(manager.collections.some(function (el) {
                return el.name === "quxs" && el.schema.name === "qux" && el._stack.length === 0;
            }));
            test.done();
        });
    },
    "AddCollection args - pass schema object": function (test) {
        test.expect(3);
        manager.addCollection("izones", { __name__: "izone", __identifier__: "ID" }, function (err) {
            test.ok(manager.schema.izone);
            test.ok(manager.izones);
            test.ok(manager.collections.some(function (el) {
                return el.name === "izones" && el.schema.__name__ === "izone";
            }));
            test.done();
        });
    },
    "AddCollection args - pass schema object with existing name": function (test) {
        test.expect(3);
        manager.addCollection("mitras", { __name__: "qux", __identifier__: "ID" }, function (err) {
            test.equal(err.code, "SCHEMA_EXISTS");
            test.ok(!manager.mitras);
            test.ok(!manager.collections.some(function (el) {
                return el.name === "mitras";
            }));
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
