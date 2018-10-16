'use strict';
var __decorate =
    (this && this.__decorate) ||
    function(decorators, target, key, desc) {
        var c = arguments.length,
            r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
            d;
        if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
var __metadata =
    (this && this.__metadata) ||
    function(k, v) {
        if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') return Reflect.metadata(k, v);
    };
Object.defineProperty(exports, '__esModule', { value: true });
const typeorm_1 = require('typeorm');
let SignedOrderModel = class SignedOrderModel {};
__decorate([typeorm_1.PrimaryColumn(), __metadata('design:type', String)], SignedOrderModel.prototype, 'hash', void 0);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'senderAddress',
    void 0,
);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'makerAddress', void 0);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'takerAddress', void 0);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'makerAssetData',
    void 0,
);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'takerAssetData',
    void 0,
);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'exchangeAddress',
    void 0,
);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'feeRecipientAddress',
    void 0,
);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', Number)],
    SignedOrderModel.prototype,
    'expirationTimeSeconds',
    void 0,
);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'makerFee', void 0);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'takerFee', void 0);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'makerAssetAmount',
    void 0,
);
__decorate(
    [typeorm_1.Column(), __metadata('design:type', String)],
    SignedOrderModel.prototype,
    'takerAssetAmount',
    void 0,
);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'salt', void 0);
__decorate([typeorm_1.Column(), __metadata('design:type', String)], SignedOrderModel.prototype, 'signature', void 0);
SignedOrderModel = __decorate([typeorm_1.Entity()], SignedOrderModel);
exports.SignedOrderModel = SignedOrderModel;
//# sourceMappingURL=SignedOrderModel.js.map
