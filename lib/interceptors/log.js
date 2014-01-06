/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

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

var util        = require("util"),
    _           = require("lodash"),
    wrapFns     = ["toArray", "next", "each", "count", "first", "update", "delete"];

function convertError(err) {
    if (util.isError(err)) {
        var obj = {};
        Object.getOwnPropertyNames(err).forEach(function (key) {
            obj[key] = err[key];
        });
        return obj;
    }
    return err;
}

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
 *   - `error` {Boolean}, logs error message if an error was returned by the intercepted method. Default is false.
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

        function setMeta(prop, val) {
            if (!meta) {
                meta = {};
            }
            meta[prop] = val;
        }

        function logMessage(prop, val, lvl) {
            if (prop && val) {
                setMeta(prop, val);
            }
            if (log.action || meta) {
                if (meta) {
                    logger.log(lvl || level, msg, meta);
                } else {
                    logger.log(lvl || level, msg);
                }
            }
        }

        function logError(err) {
            if (err && log.error) {
                logMessage("error", convertError(err), errorLevel);
            }
        }

        function handleResponse(err, res, profKey) {
            if (log.profile) {
                logger.profile(profKey || msg);
            }

            if (err) {
                logError(err);
            } else {
                if (log.result) {
                    logMessage("result", res);
                } else {
                    logMessage();
                }
            }
        }

        function replaceFn(cursor, orgFn, name) {
            return function (data, callback) {
                if (cursor.__tracking) {
                    if (cursor.__tracking !== name) {
                        return orgFn.call(cursor, callback);
                    }
                } else {
                    cursor.__tracking = name;
                }
                orgFn.call(cursor, function (err, res) {
                    var profKey = msg;
                    msg += "." + name;
                    handleResponse(err, res, profKey);
                    callback(err, res);
                });
            };
        }

        function wrapCursor(cursor) {
            var i;
            for (i = 0; i < wrapFns.length; i++) {
                var name = wrapFns[i];
                cursor[name] = replaceFn(cursor, cursor[name], name);
            }
        }

        if (actions && actions.indexOf(action) === -1) {
            return next(item, out);
        }

        if (log.profile) {
            logger.profile(msg);
        }

        if (log.query) {
            meta = { query: item };
        }

        if (log.context) {
            setMeta("context", context || null);
        }

        if (log.result || log.error || log.profile) {
            if (out) {
                next(item, function (err, res) {
                    if (action === "_select") {
                        wrapCursor(res);
                    } else {
                        handleResponse(err, res);
                    }
                    out(err, res);
                });
            } else {
                var cur;
                try {
                    cur = next(item);
                } catch (e) {
                    logError(e);
                    throw e;
                }
                if (cur) {
                    wrapCursor(cur);
                }
                return cur;
            }
        } else {
            logMessage();
            return next(item, out);
        }
    };
};
