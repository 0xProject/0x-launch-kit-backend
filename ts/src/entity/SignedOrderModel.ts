import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class SignedOrderModel {
    @PrimaryColumn()
    public hash!: string;

    @Column()
    public senderAddress!: string;

    @Column()
    public makerAddress!: string;

    @Column()
    public takerAddress!: string;

    @Column()
    public makerAssetData!: string;

    @Column()
    public takerAssetData!: string;

    @Column()
    public exchangeAddress!: string;

    @Column()
    public feeRecipientAddress!: string;

    @Column()
    public expirationTimeSeconds!: number;

    @Column()
    public makerFee!: string;

    @Column()
    public takerFee!: string;

    @Column()
    public makerAssetAmount!: string;

    @Column()
    public takerAssetAmount!: string;

    @Column()
    public salt!: string;

    @Column()
    public signature!: string;
}
