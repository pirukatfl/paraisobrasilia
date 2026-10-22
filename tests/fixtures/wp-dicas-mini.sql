/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19  Distrib 11.8.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: exemplo_sintetico
-- ------------------------------------------------------
-- Server version	11.8.2-MariaDB-ubu2404
-- Fixture sintético: todos os dados abaixo são inventados.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `wp26_posts`
--

DROP TABLE IF EXISTS `wp26_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wp26_posts` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_author` bigint(20) unsigned NOT NULL DEFAULT 0,
  `post_date` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `post_date_gmt` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `post_content` longtext NOT NULL,
  `post_title` text NOT NULL,
  `post_excerpt` text NOT NULL,
  `post_status` varchar(20) NOT NULL DEFAULT 'publish',
  `post_name` varchar(200) NOT NULL DEFAULT '',
  `post_modified_gmt` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `post_type` varchar(20) NOT NULL DEFAULT 'post' COMMENT 'tipo; com ponto e vírgula',
  PRIMARY KEY (`ID`),
  KEY `post_name` (`post_name`(191)),
  KEY `type_status_date` (`post_type`,`post_status`,`post_date`,`ID`),
  UNIQUE KEY `uniq_name` (`post_name`,`post_type`),
  CONSTRAINT `fk_autor` FOREIGN KEY (`post_author`) REFERENCES `wp26_users` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wp26_posts`
--

LOCK TABLES `wp26_posts` WRITE;
/*!40000 ALTER TABLE `wp26_posts` DISABLE KEYS */;
INSERT INTO `wp26_posts` VALUES (201,1,'2025-01-10 10:00:00','2025-01-10 10:00:00','Primeiro bloco sentinela alfa. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nSegundo bloco sentinela alfa. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39','Dica sentinela alfa','Resumo sentinela da dica alfa.','publish','dica-sentinela-alfa','2025-01-10 10:00:00','post'),(202,1,'2025-01-20 09:00:00','2025-01-20 09:00:00','<div class="elementor-widget-container"><!-- wp:paragraph --><p>Texto montado no Elementor casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39</p><!-- /wp:paragraph -->[elementor-template id="1"]<img src="https://exemplo.test/imagem-montada.jpg" alt="x"/><p>Segundo bloco montado casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39 [meu_widget cor="azul"]</p></div>','Dica sentinela montada','','publish','dica-montada','2025-01-20 09:00:00','post'),(203,1,'2025-02-01 08:00:00','2025-02-01 08:00:00','Terceira dica sentinela. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39 confianca40 leveza41 desejo42 pausa43 sorriso44\n\nFecho da terceira. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29','Titulo real da terceira dica','','publish','7013-2','2025-02-01 08:00:00','post'),(204,1,'2025-03-01 08:00:00','2025-03-01 08:00:00','Primeiro bloco sentinela alfa. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nSegundo bloco sentinela alfa. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39','Dica sentinela alfa repetida','','publish','dica-sentinela-alfa-copia','2025-03-01 08:00:00','post'),(205,1,'2025-02-10 08:00:00','2025-02-10 08:00:00','<p> </p>','Dica vazia sentinela','','publish','dica-vazia','2025-02-10 08:00:00','post'),(206,1,'2025-02-12 08:00:00','2025-02-12 08:00:00','Texto curto sentinela. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19','Dica curta sentinela','','publish','dica-curta','2025-02-12 08:00:00','post'),(207,1,'2025-02-14 08:00:00','2025-02-14 08:00:00','Abertura da dica de contatos. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nChame no (61) 99999-0000 ou escreva para fulano.sentinela@exemplo.test hoje mesmo.\n\nFinal da dica de contatos. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29','Dica com contatos','','publish','dica-com-contatos','2025-02-14 08:00:00','post'),(208,1,'2025-02-16 08:00:00','2025-02-16 08:00:00','Dica com plugin de SEO. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nFecho da dica com SEO. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29','Dica com descricao SEO','Resumo do post da dica de SEO.','publish','dica-com-seo','2025-02-16 08:00:00','post'),(209,1,'2025-02-18 08:00:00','2025-02-18 08:00:00','Rascunho antigo. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39 confianca40 leveza41 desejo42 pausa43 sorriso44 escuta45 clima46 ritmo47 casal48 cuidado49 conversa50 respeito51 limite52 combinado53 noite54 festa55 confianca56 leveza57 desejo58 pausa59 sorriso60 escuta61 clima62 ritmo63 casal64 cuidado65 conversa66 respeito67 limite68 combinado69','Dica em rascunho no site antigo','','draft','dica-rascunho-wp','2025-02-18 08:00:00','post'),(210,1,'2025-02-20 08:00:00','2025-02-20 08:00:00','Conto. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39 confianca40 leveza41 desejo42 pausa43 sorriso44 escuta45 clima46 ritmo47 casal48 cuidado49 conversa50 respeito51 limite52 combinado53 noite54 festa55 confianca56 leveza57 desejo58 pausa59 sorriso60 escuta61 clima62 ritmo63 casal64 cuidado65 conversa66 respeito67 limite68 combinado69','Conto fora das dicas','','publish','conto-fora','2025-02-20 08:00:00','post'),(211,1,'2025-02-22 08:00:00','2025-02-22 08:00:00','Dica nas duas categorias. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nFecho das duas categorias. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29','Dica tambem em postdev','','publish','dica-postdev','2025-02-22 08:00:00','post'),(212,1,'2025-02-24 08:00:00','2025-02-24 08:00:00','Dica com capa suspeita. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39\n\nFecho da capa suspeita. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29','Dica com capa suspeita','','publish','dica-capa-ruim','2025-02-24 08:00:00','post'),(213,1,'2025-02-26 08:00:00','2025-02-26 08:00:00','Texto sem titulo de verdade que comeca assim mesmo e segue. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19 limite20 combinado21 noite22 festa23 confianca24 leveza25 desejo26 pausa27 sorriso28 escuta29 clima30 ritmo31 casal32 cuidado33 conversa34 respeito35 limite36 combinado37 noite38 festa39 confianca40 leveza41 desejo42 pausa43 sorriso44 escuta45 clima46 ritmo47 casal48 cuidado49\n\nFim. casal cuidado conversa respeito limite combinado noite festa confianca leveza desejo pausa sorriso escuta clima ritmo casal16 cuidado17 conversa18 respeito19','4821','','publish','4821-2','2025-02-26 08:00:00','post'),(290,1,'2024-05-01 08:00:00','2024-05-01 08:00:00','','capa-dica','','inherit','capa-dica','2024-05-01 08:00:00','attachment'),(291,1,'2024-05-02 08:00:00','2024-05-02 08:00:00','','capa-ruim','','inherit','capa-ruim','2024-05-02 08:00:00','attachment'),(292,1,'2025-01-10 10:30:00','2025-01-10 10:30:00','Revisao antiga.','Dica sentinela alfa','','inherit','201-revision-v1','2025-01-10 10:30:00','revision');
/*!40000 ALTER TABLE `wp26_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wp26_terms`
--

DROP TABLE IF EXISTS `wp26_terms`;
CREATE TABLE `wp26_terms` (
  `term_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL DEFAULT '',
  `slug` varchar(200) NOT NULL DEFAULT '',
  `term_group` bigint(10) NOT NULL DEFAULT 0,
  PRIMARY KEY (`term_id`),
  KEY `slug` (`slug`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp26_terms` WRITE;
INSERT INTO `wp26_terms` VALUES (1,'Sem categoria','sem-categoria',0),(2,'Contos','contos',0),(3,'Dicas Hot','dicas-hot',0),(4,'Post Dev','postdev',0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `wp26_term_taxonomy`;
CREATE TABLE `wp26_term_taxonomy` (
  `term_taxonomy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `taxonomy` varchar(32) NOT NULL DEFAULT '',
  `description` longtext NOT NULL,
  `parent` bigint(20) unsigned NOT NULL DEFAULT 0,
  `count` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp26_term_taxonomy` WRITE;
INSERT INTO `wp26_term_taxonomy` VALUES (11,1,'category','',0,0),(12,2,'category','',0,1),(13,3,'category','',0,11),(14,4,'category','',0,1);
UNLOCK TABLES;

DROP TABLE IF EXISTS `wp26_term_relationships`;
CREATE TABLE `wp26_term_relationships` (
  `object_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `term_taxonomy_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `term_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`object_id`,`term_taxonomy_id`),
  KEY `term_taxonomy_id` (`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp26_term_relationships` WRITE;
INSERT INTO `wp26_term_relationships` VALUES (201,13,0),(202,13,0),(203,13,0),(204,13,0),(205,13,0),(206,13,0),(207,13,0),(208,13,0),(209,13,0),(211,13,0),(212,13,0),(213,13,0),(211,14,0),(210,12,0),(292,13,0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `wp26_postmeta`;
CREATE TABLE `wp26_postmeta` (
  `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `meta_key` varchar(255) DEFAULT NULL,
  `meta_value` longtext DEFAULT NULL,
  PRIMARY KEY (`meta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp26_postmeta` WRITE;
INSERT INTO `wp26_postmeta` VALUES (1,201,'_edit_lock','1736500000:1'),(2,201,'_thumbnail_id','290'),(3,290,'_wp_attached_file','2024/05/capa-dica.jpg'),(4,290,'_wp_attachment_metadata','a:1:{s:5:"width";i:800;}'),(5,202,'_elementor_edit_mode','builder'),(6,202,'_elementor_data','[{"id":"a1","elType":"section","settings":{"texto":"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}}]'),(7,208,'_yoast_wpseo_metadesc','Descricao SEO sentinela da dica oito.'),(8,208,'rank_math_description','Descricao rank math que perde para o Yoast.'),(9,211,'_members_access_role','subscriber'),(10,212,'_thumbnail_id','291'),(11,291,'_wp_attached_file','../../etc/passwd'),(12,213,'rank_math_description','Descricao Rank Math sentinela da dica 213.');
UNLOCK TABLES;

--
-- Dados pessoais sintéticos: NUNCA devem aparecer na saída.
--

DROP TABLE IF EXISTS `wp26_users`;
CREATE TABLE `wp26_users` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_login` varchar(60) NOT NULL DEFAULT '',
  `user_pass` varchar(255) NOT NULL DEFAULT '',
  `display_name` varchar(250) NOT NULL DEFAULT '',
  `user_email` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp26_users` WRITE;
INSERT INTO `wp26_users` VALUES (1,'fulano','$P$Bsentinela','Fulano Sentinela','fulano.sentinela@exemplo.test');
UNLOCK TABLES;

--
-- Tabela de um prefixo antigo, sem uso.
--

DROP TABLE IF EXISTS `wp_posts`;
CREATE TABLE `wp_posts` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_title` text NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `wp_posts` WRITE;
INSERT INTO `wp_posts` VALUES (1,'Dica do prefixo errado');
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-10 12:00:00
