/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";
debugger;
var testCase        = require("nodeunit").testCase,
    Manager         = require("../lib/manager"),
    Provider        = require("./mocks/post-provider"),
    log             = require("../lib/interceptors/log"),
    manager,
    stream;

module.exports = testCase({
    "Fixture Setup": function (test) {
        test.expect(1);

        var provider    = new Provider({ connStr: "test connection string" }, { __collName: "test" }),
            winston     = require("winston"),
            Stream      = require("stream").Duplex,
            opts        = {
                stream: new Stream()
            };

        stream = opts.stream;
        winston.add(winston.transports.File, opts);

        provider.use(log.interception());

        manager = new Manager();
        manager.addProvider(provider, "testProv", function (err) {
            test.ok(!err);
            test.done();
        });
    },
    "Log Insert": function (test) {
        test.expect(3);

        function loggingMedia(data) {
            test.equal(data, "insert");
            test.done();
        }
        stream.on("data", loggingMedia);
        manager.testProv.insert({_id: 1, name: "Foo", age: 20 }, function (err, item) {
            test.ok(!err);
            test.ok(item);
        });
    }
});
