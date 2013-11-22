/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";
debugger;
var testCase        = require("nodeunit").testCase,
    entree          = require("../lib/entree"),
    path            = require("path");

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(11);

        var fsPath = path.resolve(process.cwd(), "./data");
        entree.initialize(function (err) {
            test.ok(!err);
            test.equal(entree.providers.length, 5);
            test.ok(entree.config);
            test.ok(entree.blogs);
            test.ok(entree.posts);
            test.ok(entree.comments);
            test.ok(entree.users);
            test.equal(entree.blogs.connectionString, fsPath);
            test.equal(entree.posts.connectionString, fsPath);
            test.equal(entree.comments.connectionString, fsPath);
            test.equal(entree.users.connectionString, "mongodb://localhost/entreeTest");
            test.done();
        });
    },
    "Fixture Tear Down": function (test) {
        test.expect(0);
        entree.dispose(function (err) {
            if (err) {
                throw err;
            }
            test.done();
        });
    }
});
