import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemainingFillableTakerAssetAmount1565053808634 implements MigrationInterface {
    // tslint:disable-next-line:async-suffix prefer-function-over-method
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "signed_order_model" ADD "remainingFillableTakerAssetAmount" DEFAULT(0)`);
    }
    // tslint:disable-next-line:async-suffix prefer-function-over-method
    public async down(queryRunner: QueryRunner): Promise<any> {
        // Note DROP COLUMNN is not implemented in sqlite, this migration cannot be reverted in Sqlite
        await queryRunner.query(`ALTER TABLE "signed_order_model" DROP COLUMN "remainingFillableTakerAssetAmount"`);
    }
}
