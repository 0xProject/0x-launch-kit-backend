export class MeshEventModel {
    public id?: number;
    public hash?: string;
    public occuredAt?: string;
    public eventName?: string;
    public uuid?: string;
    constructor(
        opts: {
            hash?: string;
            occuredAt?: string;
            eventName?: string;
            uuid?: string;
        } = {},
    ) {
        this.hash = opts.hash;
        this.occuredAt = opts.occuredAt;
        this.eventName = opts.eventName;
        this.uuid = opts.uuid;
    }
}
