/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

var Cursor      = require("../../lib/cursor"),
    util        = require("util"),
    sift        = require("sift"),
    _           = require("underscore");

function CursorMock(provider, query, options) {
    "use strict";

    if (query) {
        this.sifter = sift(query);
    }
    this.items = _.values(provider.store);

    Cursor.call(this, provider, query, options);
}

util.inherits(CursorMock, Cursor);

CursorMock.prototype.reset = function () {
    "use strict";

    this.current = this.skipValue;
    if (this.current !== 0 && this.limitValue !== 0) {
        this.limitValue += this.current;
    }

    if (this.sortValue) {
        if (_.isFunction(this.sortValue)) {

        }
        this.items.sort(function (a, b) {
            // TODO:
        });
    }

    if (this.mapping && !_.isArray(this.mapping)) {
        if (_.isObject(this.mapping)) {
            this.mapping = _.keys(this.mapping);
        } else if (_.isString(this.mapping)) {
            this.mapping = [this.mapping];
        } else if (!_.isFunction(this.mapping)) {
            throw new Error("Unsuported arument type.");
        }
    }
};

CursorMock.prototype._isMatch = function (item) {

    if (this.sifter) {
        return this.sifter.test(item);
    }
    return true;
};

CursorMock.prototype._map = function (item) {
    if (_.isFunction(this.mapping)) {
        return this.mapping(item);
    }
    return _.pick.apply(null, [item].concat(this.mapping));
};

CursorMock.prototype._nextObject = function (callback) {
    "use strict";

    var self = this;
    function nextItem() {
        var item;
        if (self.limitValue === 0 || self.current < self.limitValue) {
            item = self.items[self.current++];
            while (item) {
                if (self._isMatch(item)) {
                    break;
                }
                item = self.items[self.current++];
            }

            if (item && self.mapping) {
                item = self._map(item);
            }
        }
        callback(null, item);
    }

    if (this.provider.sync) {
        nextItem();
    } else {
        process.nextTick(nextItem);
    }
};

module.exports = CursorMock;
