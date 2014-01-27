/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var Manager         = require("./manager"),
    Strings         = require("./strings"),
    _               = require("lodash");

function isInitialized() {
    return !!exports.manager;
}

function createManager(opts, callback) {
    var man;
    if (!callback && opts) {
        callback = opts;
    }
    if (!opts) {
        opts = {};
    }

    if (opts.manager) {
        man = new (require(opts.manager))();
    } else {
        man = new Manager();
    }
    man.init(opts, function (err) {
        callback(err, man);
    });
}

function init(opts, replace, done) {
    var k, err;

    if (_.isFunction(replace)) {
        done = replace;
        replace = false;
    } else if (_.isFunction(opts)) {
        done = opts;
        replace = undefined;
        opts = undefined;
    }

    if (_.isBoolean(opts)) {
        replace = opts;
        opts = undefined;
    }

    if (exports.manager) {
        if (!replace) {
            err = new Error(Strings.ERR_ALREADY_INIT);
            if (done) {
                done(err);
            }
            throw err;
        }
        if (exports.dispose) {
            exports.dispose();
        }
        for (k in exports) {
            delete exports[k];
        }
    }
    createManager(opts, function (err, manager) {
        if (!err) {
            _.extend(exports, manager);
            _.mixin(exports, manager);

            exports.manager = manager;
            assign();
        }
        if (done) {
            done(err);
        }
    });
}

function assign() {
    exports.createManager   = createManager;
    exports.isInitialized   = isInitialized;
    exports.init            = init;
}

assign();
