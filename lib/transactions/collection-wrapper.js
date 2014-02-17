/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

function CollectionWrapper(trans, collection) {
    this.trans = trans;
    this.collection = collection;
}

module.exports = CollectionWrapper;
