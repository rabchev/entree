/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var _ = require("lodash");

exports.interception = function (opts, actions) {
    if (!opts) {
        opts = {};
    }

    var logger  = opts.logger || require("winston"),
        level   = opts.level || "info",
        i;

    if (actions) {
        if (!_.isArray(actions)) {
            actions = [actions];
        }

        for (i = 0; i < actions.length; i++) {
            if (actions[i].charAt(0) !== "_") {
                actions[i] = "_" + actions[i];
            }
        }
    }

    return function (action, context, item, next, out) {

    };
};
