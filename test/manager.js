/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    path            = require("path"),
    manager;

module.exports = testCase({
    "Fixture Setup": function (test) {
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
            test.equal(manager.blogs.dir, fsPath + "/blogs");
            test.equal(manager.posts.dir, fsPath + "/posts");
            test.equal(manager.comments.options.connStr, "mongodb://localhost/entreeTest");
            test.equal(manager.users.dir, fsPath + "/users");
            test.done();
        });
    },
    "Fixture Tear Down": function (test) {
        test.expect(0);
        manager.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    }
});
