/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";
debugger;
var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    Provider        = require("./mocks/post-provider"),
    log             = require("../lib/interceptors/log"),
    map             = require('map-stream'),
    msgs            = [],
    manager,
    stream;

function logger(data) {
    msgs.push(data);
}

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" }),
            winston     = require("winston"),
            opts        = {
                stream: map(function (data, callback) { callback(null, data); })
            };

        stream = opts.stream;
        winston.add(winston.transports.File, opts);
        winston.remove(winston.transports.Console);
        stream.on("data", logger);
        provider.use(log.interception());

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Log Insert Action": function (test) {
        test.expect(4);

        manager.testProv.insert({_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            test.ok(msgs[0].indexOf("{\"level\":\"info\",\"message\":\"testProv._insert\",\"timestamp\":") === 0);
            test.done();
        });
    },
    "Log Get Action": function (test) {
        test.expect(4);

        msgs.length = 0;
        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            test.ok(msgs[0].indexOf("{\"level\":\"info\",\"message\":\"testProv._get\",\"timestamp\":") === 0);
            test.done();
        });
    },
    "Log Performance": function (test) {
        test.expect(4);

        var itmes   = [
                {_id: 2, name: "Bar", age: 21 },
                {_id: 3, name: "Baz", age: 22 },
                {_id: 4, name: "Qux", age: 20 },
                {_id: 5, name: "Fie", age: 31 },
                {_id: 6, name: "Fee", age: 33 }
            ];

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { profile: true } }));
        manager.testProv.delay = 10;

        manager.testProv.insert(itmes, function (err, items) {
            test.ok(!err);
            test.ok(items);
            test.equal(msgs.length, 1);
            test.ok(msgs[0].indexOf("{\"level\":\"info\",\"message\":\"testProv._insert { duration:") === 0);
            test.done();
        });
    },
    "Log Get Query": function (test) {
        test.expect(4);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { query: true } }));
        manager.testProv.delay = 0;

        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.query, 1);
            test.done();
        });
    },
    "Log Get Result": function (test) {
        test.expect(4);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { result: true } }));

        manager.testProv.get(3, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.result.name, "Baz");
            test.done();
        });
    },
    "Log Get Query & Result": function (test) {
        test.expect(6);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { query: true, result: true } }));

        manager.testProv.get(3, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.message, "testProv._get");
            test.equal(obj.query, 3);
            test.equal(obj.result.name, "Baz");
            test.done();
        });
    },
    "Log Error": function (test) {
        test.expect(4);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true } }));

        manager.testProv.get(23, function (err, item) {
            test.ok(err);
            test.ok(!item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.error.message, "Item does not exist.");
            test.done();
        });
    },
    "Log Error Only no Error": function (test) {
        test.expect(3);

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true } }));

        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 0);
            test.done();
        });
    },
    "Log Get Query, Result & Error": function (test) {
        test.expect(7);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true, query: true, result: true } }));

        manager.testProv.get(23, function (err, item) {
            test.ok(err);
            test.ok(!item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.error.message, "Item does not exist.");
            test.equal(obj.message, "testProv._get");
            test.equal(obj.query, 23);
            test.ok(!obj.result);
            test.done();
        });
    },
    "Log Get Query, Profile & Error": function (test) {
        test.expect(8);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true, query: true, profile: true } }));

        manager.testProv.get(23, function (err, item) {
            test.ok(err);
            test.ok(!item);
            test.equal(msgs.length, 2);
            test.ok(msgs[0].indexOf("{\"level\":\"info\",\"message\":\"testProv._get { duration:") === 0);
            obj = JSON.parse(msgs[1]);
            test.equal(obj.error.message, "Item does not exist.");
            test.equal(obj.message, "testProv._get");
            test.equal(obj.query, 23);
            test.ok(!obj.result);
            test.done();
        });
    },
    "Log Get Action & Error no Error": function (test) {
        test.expect(4);

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true, action: true } }));

        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            test.ok(msgs[0].indexOf("{\"level\":\"info\",\"message\":\"testProv._get\",\"timestamp\":") === 0);
            test.done();
        });
    },
    "Log Get Action & Error with Error": function (test) {
        test.expect(6);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { error: true, action: true } }));

        manager.testProv.get(43, function (err, item) {
            test.ok(err);
            test.ok(!item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.error.message, "Item does not exist.");
            test.equal(obj.message, "testProv._get");
            test.equal(obj.level, "error");
            test.done();
        });
    },
    "Log Context": function (test) {
        test.expect(4);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { context: true } }));

        manager.testProv.get({ user: "my name" }, 1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.context.user, "my name");
            test.done();
        });
    },
    "Log Context no Context": function (test) {
        test.expect(4);

        var obj;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { context: true } }));

        manager.testProv.get(1, function (err, item) {
            test.ok(!err);
            test.ok(item);
            test.equal(msgs.length, 1);
            obj = JSON.parse(msgs[0]);
            test.equal(obj.context, null);
            test.done();
        });
    },
    "Log Cursor Result no Callback": function (test) {
        test.expect(3);

        var obj, cur;

        msgs.length = 0;
        manager.testProv._stack.length = 0;
        manager.testProv.use(log.interception({ log: { result: true } }));

        cur = manager.testProv.select();
        cur.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 6);
            test.equal(msgs.length, 1);
            test.done();
        });
    }
});
