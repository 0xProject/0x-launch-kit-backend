'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var MeshEventModel = /** @class */ (function() {
    function MeshEventModel(opts) {
        if (opts === void 0) {
            opts = {};
        }
        this.hash = opts.hash;
        this.occuredAt = opts.occuredAt;
        this.eventName = opts.eventName;
        this.uuid = opts.uuid;
    }
    return MeshEventModel;
})();
exports.MeshEventModel = MeshEventModel;
