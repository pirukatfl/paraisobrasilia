import * as migration_20261017_202602_initial from './20261017_202602_initial';
import * as migration_20261017_203909_party_details from './20261017_203909_party_details';
import * as migration_20261017_204209_seo_and_og from './20261017_204209_seo_and_og';
import * as migration_20261017_204729_party_drafts from './20261017_204729_party_drafts';
import * as migration_20261019_023755_contact_global from './20261019_023755_contact_global';
import * as migration_20261019_025904_pages from './20261019_025904_pages';
import * as migration_20261019_031103_space_gallery from './20261019_031103_space_gallery';
import * as migration_20261019_032314_models from './20261019_032314_models';
import * as migration_20261019_122821_assinantes from './20261019_122821_assinantes';
import * as migration_20261019_123931_plans from './20261019_123931_plans';
import * as migration_20261019_125108_subscriptions from './20261019_125108_subscriptions';
import * as migration_20261019_130455_audit_log from './20261019_130455_audit_log';
import * as migration_20261019_185421_classisex_ads from './20261019_185421_classisex_ads';
import * as migration_20261019_191255_classisex_moderation from './20261019_191255_classisex_moderation';
import * as migration_20261019_194154_ad_media from './20261019_194154_ad_media';
import * as migration_20261019_211202_ad_reports from './20261019_211202_ad_reports';
import * as migration_20261020_022629_classisex_ajustes from './20261020_022629_classisex_ajustes';

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
    name: '20261019_122821_assinantes',
  },
  {
    up: migration_20261019_123931_plans.up,
    down: migration_20261019_123931_plans.down,
    name: '20261019_123931_plans',
  },
  {
    up: migration_20261019_125108_subscriptions.up,
    down: migration_20261019_125108_subscriptions.down,
    name: '20261019_125108_subscriptions',
  },
  {
    up: migration_20261019_130455_audit_log.up,
    down: migration_20261019_130455_audit_log.down,
    name: '20261019_130455_audit_log',
  },
  {
    up: migration_20261019_185421_classisex_ads.up,
    down: migration_20261019_185421_classisex_ads.down,
    name: '20261019_185421_classisex_ads',
  },
  {
    up: migration_20261019_191255_classisex_moderation.up,
    down: migration_20261019_191255_classisex_moderation.down,
    name: '20261019_191255_classisex_moderation',
  },
  {
    up: migration_20261019_194154_ad_media.up,
    down: migration_20261019_194154_ad_media.down,
    name: '20261019_194154_ad_media',
  },
  {
    up: migration_20261019_211202_ad_reports.up,
    down: migration_20261019_211202_ad_reports.down,
    name: '20261019_211202_ad_reports',
  },
  {
    up: migration_20261020_022629_classisex_ajustes.up,
    down: migration_20261020_022629_classisex_ajustes.down,
    name: '20261020_022629_classisex_ajustes'
  },
];
