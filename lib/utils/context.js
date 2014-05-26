"use strict";

function Context(obj) {
    if (obj) {
        this.__orgObj = obj;
    } else if (obj === null) {
        this.__isEmpty = true;
    }
}

module.exports = Context;
