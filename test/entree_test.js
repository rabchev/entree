/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    entree          = require("../lib/entree"),
    path            = require("path"),
    fsPath          = path.resolve(process.cwd(), "./data"),
    manager;

module.exports = testCase({
    "Create Manger": function (test) {
        test.expect(11);

        entree.createManager(function (err, man) {
            manager = man;
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
    "Init Entree Without Options": function (test) {
        test.expect(11);

        entree.init(function (err) {
            test.ok(!err);
            test.equal(entree.providers.length, 5);
            test.ok(entree.config);
            test.ok(entree.blogs);
            test.ok(entree.posts);
            test.ok(entree.comments);
            test.ok(entree.users);
            test.equal(entree.blogs.dir, path.join(fsPath, "blogs"));
            test.equal(entree.posts.dir, path.join(fsPath, "posts"));
            test.equal(entree.comments.options.connStr, "mongodb://localhost/entreeTest");
            test.equal(entree.users.dir, path.join(fsPath, "users"));
            test.done();
        });
    },
    "Replace Entree With Options": function (test) {
        test.expect(5);

        var opts = {
            model: {
                providers: [
                    {
                        provider: "file-system",
                        options: {
                            connStr: "./data"
                        },
                        collections: [
                            { name: "foo" }
                        ]
                    }
                ]
            }
        };

        entree.init(opts, true, function (err) {
            test.ok(!err);
            test.equal(entree.providers.length, 2);
            test.ok(entree.config);
            test.ok(entree.foo);
            test.equal(entree.foo.dir, path.join(fsPath, "foo"));
            entree.dispose();
            test.done();
        });
    },
    "Dispose Manger": function (test) {
        test.expect(0);
        manager.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    }
});
