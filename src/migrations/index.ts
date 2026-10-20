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
import * as migration_20261020_131108_contos from './20261020_131108_contos';
import * as migration_20261020_132231_contos_wp_bundle from './20261020_132231_contos_wp_bundle';
import * as migration_20261020_132752_recados from './20261020_132752_recados';
import * as migration_20261020_133947_recados_moderation from './20261020_133947_recados_moderation';
import * as migration_20261020_135558_mensagens from './20261020_135558_mensagens';
import * as migration_20261020_141021_mensagens_seguranca from './20261020_141021_mensagens_seguranca';
import * as migration_20261020_172550_conta_gratuita from './20261020_172550_conta_gratuita';
import * as migration_20261020_173000_contos_wp_bundle_carga from './20261020_173000_contos_wp_bundle_carga';

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
    name: '20261020_022629_classisex_ajustes',
  },
  {
    up: migration_20261020_131108_contos.up,
    down: migration_20261020_131108_contos.down,
    name: '20261020_131108_contos',
  },
  {
    up: migration_20261020_132231_contos_wp_bundle.up,
    down: migration_20261020_132231_contos_wp_bundle.down,
    name: '20261020_132231_contos_wp_bundle',
  },
  {
    up: migration_20261020_132752_recados.up,
    down: migration_20261020_132752_recados.down,
    name: '20261020_132752_recados',
  },
  {
    up: migration_20261020_133947_recados_moderation.up,
    down: migration_20261020_133947_recados_moderation.down,
    name: '20261020_133947_recados_moderation',
  },
  {
    up: migration_20261020_135558_mensagens.up,
    down: migration_20261020_135558_mensagens.down,
    name: '20261020_135558_mensagens',
  },
  {
    up: migration_20261020_141021_mensagens_seguranca.up,
    down: migration_20261020_141021_mensagens_seguranca.down,
    name: '20261020_141021_mensagens_seguranca',
  },
  {
    up: migration_20261020_172550_conta_gratuita.up,
    down: migration_20261020_172550_conta_gratuita.down,
    name: '20261020_172550_conta_gratuita'
  },
  {
    up: migration_20261020_173000_contos_wp_bundle_carga.up,
    down: migration_20261020_173000_contos_wp_bundle_carga.down,
    name: '20261020_173000_contos_wp_bundle_carga',
  },
];
