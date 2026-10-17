import * as migration_20261017_202602_initial from './20261017_202602_initial';

export const migrations = [
  {
    up: migration_20261017_202602_initial.up,
    down: migration_20261017_202602_initial.down,
    name: '20261017_202602_initial'
  },
];
