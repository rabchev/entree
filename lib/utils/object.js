/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

"use strict";

var Err         = require("./error"),
    _           = require("lodash");

require("./string");

function validateKeys(data) {
    var keys = Object.keys(data),
        type;

    keys.every(function (el) {
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

function update(data, trg, insert) {
    var type = validateKeys(data);

    if (type === "mixed") {
        throw new Err("INVALID_FIELD_NAME");
    }
    if (type === "fields") {
        return data;
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

    return trg;
}

exports.update = update;
exports.validateKeys = validateKeys;
exports.index = index;
