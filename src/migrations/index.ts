import * as migration_20261017_202602_initial from './20261017_202602_initial';
import * as migration_20261017_203909_party_details from './20261017_203909_party_details';
import * as migration_20261017_204209_seo_and_og from './20261017_204209_seo_and_og';
import * as migration_20261017_204729_party_drafts from './20261017_204729_party_drafts';
import * as migration_20261019_023755_contact_global from './20261019_023755_contact_global';
import * as migration_20261019_025904_pages from './20261019_025904_pages';
import * as migration_20261019_031103_space_gallery from './20261019_031103_space_gallery';
import * as migration_20261019_032314_models from './20261019_032314_models';
import * as migration_20261019_122821_assinantes from './20261019_122821_assinantes';

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
    name: '20261017_204729_party_drafts',
  },
  {
    up: migration_20261019_023755_contact_global.up,
    down: migration_20261019_023755_contact_global.down,
    name: '20261019_023755_contact_global',
  },
  {
    up: migration_20261019_025904_pages.up,
    down: migration_20261019_025904_pages.down,
    name: '20261019_025904_pages',
  },
  {
    up: migration_20261019_031103_space_gallery.up,
    down: migration_20261019_031103_space_gallery.down,
    name: '20261019_031103_space_gallery',
  },
  {
    up: migration_20261019_032314_models.up,
    down: migration_20261019_032314_models.down,
    name: '20261019_032314_models',
  },
  {
    up: migration_20261019_122821_assinantes.up,
    down: migration_20261019_122821_assinantes.down,
    name: '20261019_122821_assinantes'
  },
];
