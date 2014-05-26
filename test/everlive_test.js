/*jshint -W106 */

"use strict";

var url         = require("url"),
    http        = require("http"),
    testCase    = require("./common-provider"),
    provider    = "../lib/providers/everlive",
    options        = {
        connStr: "http://api.everlive.com/v1/uZEGyZYKiSq5CTSq/"//,
        //authorization: "MasterKey PqmmvlWWBF5svReW7p3mkYG9X61nus1w"
    },
    schema     = {
        __collName: "blogs",
        identifier: "_id"
    };

function init(callback) {
    var opts    = url.parse(url.resolve(options.connStr, schema.__collName)),
        req;

    opts.method     = "DELETE";
    opts.headers    = { "Content-Type": "application/json" };

    req = http.request(opts, function (res) {
        var result  = "";

        res.setEncoding("utf8");
        res.on("data", function (data) {
            result += data;
        });

        if (res.statusCode === 200) {
            callback();
        } else {
            if (res.headers["content-length"]) {
                res.on("end", function () {
                    callback(new Error(result));
                });
            } else {
                callback(new Error("Request failed with status code: " + res.statusCode));
            }
        }
    });

    req.on("error", function (err) {
        callback(err);
    });

    req.end();
}

module.exports = testCase.getTestCase(provider, options, schema, { item_doesnt_exist: "{\"message\":\"Item not found.\",\"errorCode\":801}" }, init);
