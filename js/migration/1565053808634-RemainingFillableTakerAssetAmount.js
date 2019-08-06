'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
class RemainingFillableTakerAssetAmount1565053808634 {
    // tslint:disable-next-line:async-suffix prefer-function-over-method
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "signed_order_model" ADD "remainingFillableTakerAssetAmount" DEFAULT(0)`);
    }
    // tslint:disable-next-line:async-suffix prefer-function-over-method
    async down(queryRunner) {
        // Note DROP COLUMNN is not implemented in sqlite, this migration cannot be reverted in Sqlite
        await queryRunner.query(`ALTER TABLE "signed_order_model" DROP COLUMN "remainingFillableTakerAssetAmount"`);
    }
}
exports.RemainingFillableTakerAssetAmount1565053808634 = RemainingFillableTakerAssetAmount1565053808634;
