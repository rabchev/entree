/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

/**
 * Interception module for logging usage, performance and error information about data provider methods.
 *
 * By default the interceptor uses [winston](https://github.com/flatiron/winston) library for logging. Winston can be configured as you would normally do. Please see **winston** documentation. To set custom logger use `options.logger` property.
 *
 * @example
 *  var entree  = require("entree"),
 *      log     = entree.resolveInterceptor("log"),
 *      opts    = {
 *          level: "info",
 *          log: {
 *              action: true,
 *              query: true
 *          }
 *      };
 *
 * entree.posts.use(log.interception(opts, ["insert", "update", "delete"]));
 *
 *
 * @example
 *  var options = {
 *      logger: require("path/to/logger"); // or an instance of winston logger
 *  };
 *
 * provider.use(log.interception(options));
 *
 * @module log
 */

"use strict";

var _           = require("lodash"),
    Cursor      = require("../cursor");

/**
 * Configures and returns an interceptor function.
 *
 * Options
 *
 * - `logger` {Object}, logger instance, if omitted default **winston** instance is used.
 * - `level` {String}, logging level for actions in normal flow. Default is "info".
 * - `errorLevel` {String}, logging level for errors. Default is "error".
 * - `log` {Object}, defines what type of information should be logged. By default only actions are logged.
 *   - `action` {Boolean}, logs the name of the intercepted method. Default is true.
 *   - `profile` {Boolean}, profiles, logs execution duration, for all intercepted methods in milliseconds. Default is false.
 *   - `query` {Boolean}, logs the "query" argument of the intercepted method as metadata. Default is false.
 *   - `context` {Boolean}, logs the "context" argument of the intercepted method as metadata. Default is false.
 *   - `result` {Boolean}, logs the result returned by the intercepted method as metadata. NOTE: This is potentially dangerous option for select method if the returned result set is very large. Default is false.
 *
 * @param {object=} opts - Logger options.
 * @param {(string|string[])=} actions - Specifies which actions should be logged. Could be single action or an array of actions. If omitted, all actions are logged.
 *  Possible values are: `["insert", "upsert", "update", "get", "delete", "select"]`
 */
exports.interception = function (opts, actions) {
    if (!opts) {
        opts = {};
    }

    var logger      = opts.logger || require("winston"),
        level       = opts.level || "info",
        errorLevel  = opts.errorLevel || "error",
        log         = opts.log || { action: true },
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
        var msg = this.name + "." + action,
            meta;

        if (log.profile) {
            logger.profile(msg);
        }

        if (log.query) {
            meta = { query: item };
        }

        if (log.context) {
            if (!meta) {
                meta = {};
            }
            meta.context = context;
        }

        if (log.action) {
            logger.log(level, msg, meta);
        }

        if (log.result || log.error || log.profile) {
            if (out) {
                next(item, function (err, res) {
                    if (err && log.error) {
                        logger.log(errorLevel, msg, err);
                    } else if (log.result) {
                        if (res instanceof Cursor) {
                            // TODO: handle cursor
                            console.log(">><<");
                        } else {
                            if (!meta) {
                                meta = {};
                            }
                            meta.result = res;
                            logger.log(level, msg, meta);
                            if (log.profile) {
                                logger.profile(msg);
                            }
                        }
                        out(err, res);
                    }
                });
            } else {
                var cur;
                try {
                    cur = next(item);
                } catch (e) {
                    if (log.error) {
                        logger.log(errorLevel, msg, e);
                    }
                    throw e;
                }
                if (cur) {
                    // TODO: handle cursor
                    console.log(">><<");
                }
                return cur;
            }
        } else {
            return next(item, out);
        }
    };
};
