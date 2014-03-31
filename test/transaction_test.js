/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    Provider        = require("./mocks/post-provider"),
    async           = require("async"),
    manager;

module.exports = testCase({
//    "Fixture Setup": function (test) {
//        test.expect(3);
//
//        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" });
//
//        manager = new Manager();
//        async.parallel([
//            function (done) {
//                manager.addProvider(provider, "users", function (err) {
//                    test.ok(!err);
//                    done(err);
//                });
//            },
//            function (done) {
//                manager.addProvider(provider, "posts", function (err) {
//                    test.ok(!err);
//                    done(err);
//                });
//            },
//            function (done) {
//                manager.addProvider(provider, "comments", function (err) {
//                    test.ok(!err);
//                    done(err);
//                });
//            },
//            function (done) {
//                manager.configure({ omitModelDoc: true }, done);
//            }
//        ], function () {
//            test.done();
//        });
//    },
//    "Commit With Transaction": function (test) {
//        test.expect(4);
//
//        manager.transaction.set(["posts", "comments"], function (err, posts, comments, trans) {
//            test.ok(!err);
//            test.ok(posts);
//            test.ok(comments);
//            test.ok(trans);
//            test.done();
//        });
//    },
//    "Fixture Tear Down": function (test) {
//        test.expect(1);
//        manager.dispose(function (err) {
//            test.ok(!err);
//            test.done();
//        });
//    }
});
