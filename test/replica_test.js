/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    async           = require("async"),
    path            = require("path"),
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
//    "Insert Item": function (test) {
//        test.expect(2);
//
//        manager.posts.insert({_id: 2, name: "Bar", age: 20 }, function (err, item) {
//            test.ok(!err);
//            test.ok(item);
//
//            test.done();
//        });
//    }
});
