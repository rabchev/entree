/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var testCase        = require("nodeunit").testCase,
    Provider        = require("../lib/providers/file-system"),
    Strings         = require("../lib/strings"),
    fs              = require("fs"),
    path            = require("path"),
    uuid            = require('node-uuid'),
    ids             = {},
    blogs,
    context;

function assertFirstItem(test, err, result) {
    test.ok(!err);
    test.ok(result);
    test.ok(result._id);
    test.equal(result.title, "My Blog");
    test.equal(result.author, "Me Me Me");
    test.equal(result.age, 43);
}

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(2);

        var connStr     = __dirname + "/data",
            options     = { typeName: "blogs" };

        context = {
            user: {
                id: "FB5544",
                name: "John Smit",
                roles: [
                    "Managers",
                    "Contributers",
                    "Users"
                ]
            }
        };

        function createProvider() {
            blogs = new Provider(connStr, options);

            test.equal(blogs.connectionString, connStr);
            test.equal(blogs.options, options);

            test.done();
        }

        fs.exists(connStr, function (exists) {
            if (exists) {
                createProvider();
            } else {
                fs.mkdir(connStr, function (err) {
                    if (err) {
                        throw err;
                    }
                    createProvider();
                });
            }
        });
    },
    "Insert Item": function (test) {
        test.expect(7);

        blogs.insert(context, {
            title: "My Blog",
            author: "Me Me Me",
            age: 43
        }, function (err, result) {

            assertFirstItem(test, err, result);
            test.ok(fs.existsSync(path.join(blogs.dir, result._id + ".json")));
            ids.firstItem = result._id;
            test.done();
        });
    },
    "Upsurt Existing Item": function (test) {
        test.expect(7);

        blogs.upsert(context, {
            _id: ids.firstItem,
            title: "My Updated Blog",
            age: 22
        }, function (err, result) {
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, ids.firstItem);
            test.equal(result.title, "My Updated Blog");
            test.equal(result.author, "Me Me Me");
            test.equal(result.age, 22);

            test.ok(fs.existsSync(path.join(blogs.dir, ids.firstItem + ".json")));

            test.done();
        });
    },
    "Upsurt New Item": function (test) {
        test.expect(7);

        blogs.upsert(context, {
            title: "My New Blog",
            author: "Me Me Me",
            age: 33
        }, function (err, result) {
            test.ok(!err);
            test.ok(result);
            test.ok(result._id);
            test.equal(result.title, "My New Blog");
            test.equal(result.author, "Me Me Me");
            test.equal(result.age, 33);
            ids.secondId = result._id;
            test.ok(fs.existsSync(path.join(blogs.dir, ids.secondId + ".json")));

            test.done();
        });
    },
    "Update Item": function (test) {
        test.expect(7);

        blogs.update(context, {
            _id: ids.secondId,
            author: "",
            age: 127
        }, function (err, result) {
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, ids.secondId);
            test.equal(result.title, "My New Blog");
            test.equal(result.author, "");
            test.equal(result.age, 127);
            ids.secondId = result._id;
            test.ok(fs.existsSync(path.join(blogs.dir, ids.secondId + ".json")));

            test.done();
        });
    },
    "Get Item By ID": function (test) {
        test.expect(7);

        blogs.get(context, ids.secondId, function (err, result) {
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, ids.secondId);
            test.equal(result.title, "My New Blog");
            test.equal(result.author, "");
            test.equal(result.age, 127);
            ids.secondId = result._id;
            test.ok(fs.existsSync(path.join(blogs.dir, ids.secondId + ".json")));

            test.done();
        });
    },
    "Get Item By Example": function (test) {
        test.expect(7);

        blogs.get(context, { _id: ids.secondId }, function (err, result) {
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, ids.secondId);
            test.equal(result.title, "My New Blog");
            test.equal(result.author, "");
            test.equal(result.age, 127);
            ids.secondId = result._id;
            test.ok(fs.existsSync(path.join(blogs.dir, ids.secondId + ".json")));

            test.done();
        });
    },
    "Get None Existent Item": function (test) {
        test.expect(2);

        blogs.get(context, uuid.v1(), function (err) {
            test.ok(err);
            test.equal(err.message, Strings.ITEM_DOESNOT_EXIST);
            test.done();
        });
    },
    "Delete Item By ID": function (test) {
        test.expect(3);

        blogs.delete(context, ids.secondId, function (err, result) {
            test.ok(!err);
            test.equal(result, ids.secondId);
            test.ok(!fs.existsSync(path.join(blogs.dir, ids.secondId + ".json")));
            test.done();
        });
    },
    "Delete Item By Example": function (test) {
        test.expect(3);

        var item = { _id: ids.firstItem };
        blogs.delete(context, item, function (err, result) {
            test.ok(!err);
            test.equal(result, item);
            test.ok(!fs.existsSync(path.join(blogs.dir, ids.firstItem + ".json")));
            test.done();
        });
    },
    "Delete None Existent Item": function (test) {
        test.expect(2);

        blogs.delete(context, uuid.v1(), function (err) {
            test.ok(err);
            test.equal(err.message, Strings.ITEM_DOESNOT_EXIST);
            test.done();
        });
    }
});
