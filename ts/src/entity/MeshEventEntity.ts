import { EntitySchema } from 'typeorm';

import { MeshEventModel } from '../models/MeshEventModel';

export const meshEventEntity = new EntitySchema<MeshEventModel>({
    name: 'MeshEvent',
    target: MeshEventModel,
    columns: {
        id: {
            primary: true,
            type: 'varchar',
            generated: 'uuid',
        },
        hash: {
            type: 'varchar',
        },
        occuredAt: {
            type: 'varchar',
        },
        eventName: {
            type: 'varchar',
        },
        uuid: {
            type: 'varchar',
            default: '0',
        },
    },
});
