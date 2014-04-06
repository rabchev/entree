/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

"use strict";

var Err         = require("./error"),
    _           = require("lodash");

require("./string");

function validateKeys(data, idKey) {
    var keys = Object.keys(data),
        type;

    keys.every(function (el) {
        if (el === idKey) {
            return true;
        }
        if (el.startsWith("$")) {
            if (type === "fields") {
                type = "mixed";
                return false;
            }
            type = "opers";
        } else {
            if (type === "opers") {
                type = "mixed";
                return false;
            }
            type = "fields";
        }
        return true;
    });
    return type;
}

function index(obj, idx, value) {
    if (typeof idx === "string") {
        return index(obj, idx.split("."), value);
    } else if (idx.length === 1 && value !== undefined) {
        return (obj[idx[0]] = value);
    } else if (idx.length === 0) {
        return obj;
    } else {
        var val = obj[idx[0]];
        if (!val) {
            if (value === undefined) {
                return undefined;
            }
            obj[idx[0]] = val = {};
        }
        return index(val, idx.slice(1), value);
    }
}

function update(data, trg, insert, idKey) {
    if (typeof insert === "string") {
        idKey = insert;
        insert = null;
    }

    var id,
        itm,
        set,
        type = validateKeys(data, idKey);

    if (type === "mixed") {
        throw new Err("INVALID_FIELD_NAME");
    }
    if (type === "fields") {
        return data;
    }
    if (idKey) {
        if (data.$set && data.$set[idKey]) {
            id = data[idKey];
            set = true;
            delete data.$set[idKey];
        }
        if (data[idKey]) {
            id = data[idKey];
            itm = true;
            delete data[idKey];
        }
    }

    if (insert && data.$setOnInsert) {
        _.merge(trg, data.$setOnInsert);
    }

    if (data.$set) {
        _.merge(trg, data.$set);
    }

    if (data.$inc) {
        _.reduce(data.$inc, function (res, val, key) {
            var orgVal = index(trg, key);
            if (orgVal) {
                val = orgVal + val;
            }
            index(trg, key, val);
            return trg;
        }, trg);
    }

    if (itm) {
        data[idKey] = id;
    }
    if (set) {
        data.$set[idKey] = id;
    }

    return trg;
}

exports.update = update;
exports.validateKeys = validateKeys;
exports.index = index;
