export interface StringifiedSignedOrder {
    senderAddress: string;
    makerAddress: string;
    takerAddress: string;
    makerFee: string;
    takerFee: string;
    makerAssetAmount: string;
    takerAssetAmount: string;
    makerAssetData: string;
    takerAssetData: string;
    salt: string;
    exchangeAddress: string;
    feeRecipientAddress: string;
    expirationTimeSeconds: string;
    signature: string;
}

export enum OrderEventKind {
    Invalid = 'INVALID',
    Added = 'ADDED',
    Filled = 'FILLED',
    FullyFilled = 'FULLY_FILLED',
    Cancelled = 'CANCELLED',
    Expired = 'EXPIRED',
    Unfunded = 'UNFUNDED',
    FillabilityIncreased = 'FILLABILITY_INCREASED',
}

export interface OrderEventPayload {
    subscription: string;
    result: OrderEvent[];
}

export interface OrderEvent {
    orderHash: string;
    signedOrder: StringifiedSignedOrder;
    kind: OrderEventKind;
    fillableTakerAssetAmount: string;
    txHash: string;
}

export interface AcceptedOrderInfo {
    orderHash: string;
    signedOrder: StringifiedSignedOrder;
    fillableTakerAssetAmount: string;
}

export enum RejectedKind {
    ZeroexValidation = 'ZEROEX_VALIDATION',
    MeshError = 'MESH_ERROR',
    MeshValidation = 'MESH_VALIDATION',
}

export enum RejectedCode {
    InternalError = 'InternalError',
    MaxOrderSizeExceeded = 'MaxOrderSizeExceeded',
    OrderAlreadyStored = 'OrderAlreadyStored',
    OrderForIncorrectNetwork = 'OrderForIncorrectNetwork',
    NetworkRequestFailed = 'NetworkRequestFailed',
    OrderHasInvalidMakerAssetAmount = 'OrderHasInvalidMakerAssetAmount',
    OrderHasInvalidTakerAssetAmount = 'OrderHasInvalidTakerAssetAmount',
    OrderExpired = 'OrderExpired',
    OrderFullyFilled = 'OrderFullyFilled',
    OrderCancelled = 'OrderCancelled',
    OrderUnfunded = 'OrderUnfunded',
    OrderHasInvalidMakerAssetData = 'OrderHasInvalidMakerAssetData',
    OrderHasInvalidTakerAssetData = 'OrderHasInvalidTakerAssetData',
    OrderHasInvalidSignature = 'OrderHasInvalidSignature',
}

export interface RejectedStatus {
    code: RejectedCode;
    message: string;
}

export interface RejectedOrderInfo {
    orderHash: string;
    signedOrder: StringifiedSignedOrder;
    kind: RejectedKind;
    status: RejectedStatus;
}

export interface ValidationResults {
    accepted: AcceptedOrderInfo[];
    rejected: RejectedOrderInfo[];
}
