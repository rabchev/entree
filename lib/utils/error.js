/*jslint devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

var Strings     = require("../strings"),
    util        = require("util");

function LocalizableError(code, message, params) {
    if (!code) {
        code = "";
    }

    if (Array.isArray(message)) {
        params = message;
        message = null;
    }

    if (!message) {
        message = Strings[code];
        if (!message) {
            message = code;
            code = null;
        }
    }

    if (!code) {
        code = "Unspecified";
    }

    if (params) {
        params.unshift(message);
        message = util.format.apply(null, params);
    }

    var err = Error.call(this, message);
    err.code = code;
    return err;
}

LocalizableError.prototype = Object.create(Error.prototype, { constructor: { value: LocalizableError }});

module.exports = LocalizableError;
