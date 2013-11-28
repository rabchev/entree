/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var Manager         = require("./manager"),
    _               = require("lodash");

function createManager(opts, callback) {
    var man;
    if (!callback && opts) {
        callback = opts;
    }
    if (!opts) {
        opts = {};
    }

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
    return exports.manager instanceof Manager;
}

function init(opts, replace, done) {
    var k;

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
            if (done) {
                done();
            }
            return;
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
