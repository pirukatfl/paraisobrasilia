import * as migration_20261017_202602_initial from './20261017_202602_initial';
import * as migration_20261017_203909_party_details from './20261017_203909_party_details';
import * as migration_20261017_204209_seo_and_og from './20261017_204209_seo_and_og';
import * as migration_20261017_204729_party_drafts from './20261017_204729_party_drafts';

export const migrations = [
  {
    up: migration_20261017_202602_initial.up,
    down: migration_20261017_202602_initial.down,
    name: '20261017_202602_initial',
  },
  {
    up: migration_20261017_203909_party_details.up,
    down: migration_20261017_203909_party_details.down,
    name: '20261017_203909_party_details',
  },
  {
    up: migration_20261017_204209_seo_and_og.up,
    down: migration_20261017_204209_seo_and_og.down,
    name: '20261017_204209_seo_and_og',
  },
  {
    up: migration_20261017_204729_party_drafts.up,
    down: migration_20261017_204729_party_drafts.down,
    name: '20261017_204729_party_drafts'
  },
];
