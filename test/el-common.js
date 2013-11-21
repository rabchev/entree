/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var url         = require("url"),
    https       = require("https"),
    testCase    = require("./common-provider"),
    provider    = "../lib/providers/everlive",
    connStr     = "https://api.everlive.com/v1/uZEGyZYKiSq5CTSq/",
    options     = {
        name: "blogs",
        identifier: "_id"//,
        //authorization: "MasterKey PqmmvlWWBF5svReW7p3mkYG9X61nus1w"
    };

function init(callback) {
    var opts    = url.parse(url.resolve(connStr, options.name)),
        req;

    opts.method     = "DELETE";
    opts.headers    = { "Content-Type": "application/json" };

    req = https.request(opts, function (res) {
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

    req.on('error', function (err) {
        callback(err);
    });

    req.end();
}

module.exports = testCase.getTestCase(provider, connStr, options, { item_doesnt_exist: "{\"message\":\"Item not found.\",\"errorCode\":801}" }, init);
