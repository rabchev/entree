/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var Manager         = require("./manager"),
    Strings         = require("./strings"),
    manager;

function createManger(opts, callback) {
    var man;
    if (opts.manager) {
        man = new (require(opts.manager))(opts);
    } else {
        man = new Manager(opts);
    }
    man.init(function (err) {
        callback(err, man);
    });
}

function isInitialized() {
    return manager !== undefined;
}

function init(opts, replace, done) {
    if (typeof opts === "function") {
        done = opts;
        opts = {};
    } else if (typeof replace === "function") {
        done = replace;
        replace = false;
    }

    if (!replace && manager) {
        return done(new Error(Strings.DEF_MAN_INITED));
    }

    createManger(opts, function (err, man) {
        if (!err) {
            manager = man;
            manager.createManager = createManger;
            manager.isInitialized = isInitialized;
            manager.initialize = init;
            module.exports = manager;
        }
        done(err);
    });
}

exports.createManager   = createManger;
exports.isInitialized   = isInitialized;
exports.initialize      = init;
