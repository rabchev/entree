/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    entree          = require("../lib/entree"),
    path            = require("path"),
    fsPath          = path.resolve(process.cwd(), "./data");

module.exports = testCase({
    "Create Manger": function (test) {
        test.expect(13);

        entree.createManager(function (err, manager) {
            test.ok(!err);
            test.equal(manager.providers.length, 0);
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
                manager.dispose(function (err) {
                    if (err) {
                        throw err;
                    }
                    test.done();
                });
            });
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
    "Add Entree Options": function (test) {
        test.expect(4);

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

        entree.configure(opts, function (err) {
            test.ok(!err);
            test.equal(entree.providers.length, 6);
            test.ok(entree.foo);
            test.equal(entree.foo.dir, path.join(fsPath, "foo"));
            test.done();
        });
    },
    "Dispose Manger": function (test) {
        test.expect(0);
        entree.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    }
});
