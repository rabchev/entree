"use strict";

var Strings     = require("../strings"),
    Err         = require("./error");

function CollectiveError(error) {
    var err = Error.call(this, Strings.COLLECTIVE_ERROR);
    err.code = "COLLECTIVE_ERROR";
    err.errors = error ? [error] : [];
    err.push = function (code, message, params) {
        if (code instanceof Error) {
            this.errors.push(code);
        } else {
            this.errors.push(new Err(code, message, params));
        }
    };
    return err;
}

CollectiveError.prototype = Object.create(Error.prototype, { constructor: { value: CollectiveError }});

module.exports = CollectiveError;
