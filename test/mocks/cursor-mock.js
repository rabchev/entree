/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

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
        this.items.sort(function (a, b) {
            // TODO: 
        });
    }
    
    if (this.projection && !_.isArray(this.projection)) {
        if (_.isObject(this.projection)) {
            this.projection = _.keys(this.projection);
        } else if (_.isString(this.projection)) {
            this.projection = [this.projection];
        } else {
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

CursorMock.prototype._project = function (item) {
    return _.pick.apply(null, [item].concat(this.projection));
};

CursorMock.prototype._nextObject = function (callback) {
    "use strict";
    
    var self = this;
    function nextItem(sync) {
        var item;
        if (self.limitValue === 0 || self.current < self.limitValue) {
            item = self.items[self.current++];
            while (item) {
                if (self._isMatch(item)) {
                    break;
                }
                item = self.items[self.current++];
            }
            
            if (item && self.projection) {
                item = self._project(item);
            }
        }
        callback(null, item, sync || false);
    }
    
    if (this.provider.sync) {
        nextItem(true);
    } else {
        process.nextTick(nextItem);
    }
};

module.exports = exports = CursorMock;