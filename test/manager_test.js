/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
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
            test.equal(manager.providers.length, 5);
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
            test.equal(manager.providers.length, 6);
            test.ok(_.find(manager.providers, function (itm) { return itm.name === "myProvider"; }));
            test.done();
        });
    },
    "Remove Pdrovider": function (test) {
        test.expect(3);

        manager.removeProvider("myProvider", function (err) {
            test.ok(!err);
            test.ok(!manager.myProvider);
            test.equal(manager.providers.length, 5);
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
    }
});
