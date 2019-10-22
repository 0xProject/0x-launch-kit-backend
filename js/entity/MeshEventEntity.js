'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var typeorm_1 = require('typeorm');
var MeshEventModel_1 = require('../models/MeshEventModel');
exports.meshEventEntity = new typeorm_1.EntitySchema({
    name: 'MeshEvent',
    target: MeshEventModel_1.MeshEventModel,
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
