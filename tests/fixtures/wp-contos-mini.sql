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
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wp26_posts`
--

LOCK TABLES `wp26_posts` WRITE;
/*!40000 ALTER TABLE `wp26_posts` DISABLE KEYS */;
INSERT INTO `wp26_posts` VALUES (101,1,'2025-01-10 10:00:00','2025-01-10 13:00:00','Primeiro parágrafo com aspas \"duplas\" e it\'s aqui.\r\n\r\nSegundo parágrafo com barra \\ invertida,\r\ncom linha dois; e um ),( estranho 😀.\r\n\r\nTerceiro parágrafo com 100\% de sentido -- sem comentário.','Conto clássico da maçã','','publish','conto-da-ma%c3%a7a','2025-01-11 00:00:00','post'),(102,1,'2025-01-20 09:00:00','2025-01-20 12:00:00','<div class=\"elementor-widget-container\"><!-- wp:paragraph --><p>Texto do conto <strong>elementor</strong> com &amp; entidade.</p><!-- /wp:paragraph -->[elementor-template id=\"12\"]<p>Segundo bloco.</p></div>','Conto &amp; Elementor','','publish','conto-elementor','2025-01-21 00:00:00','post'),(103,1,'2025-02-01 08:00:00','2025-02-01 11:00:00','Conto restrito para assinantes.\n\nSegundo parágrafo do restrito.','Conto restrito','','publish','conto-restrito','2025-02-02 00:00:00','post'),(104,1,'2025-02-15 08:00:00','2025-02-15 11:00:00','<p>Conto também em postdev.</p>','Conto em duas categorias','','publish','conto-duas-categorias','2025-02-16 00:00:00','post'),(105,1,'2025-02-20 08:00:00','2025-02-20 11:00:00','Rascunho que não deve sair.','Conto em rascunho','','draft','conto-rascunho','2025-02-20 11:00:00','post');
INSERT INTO `wp26_posts` VALUES (106,1,'2025-02-21 08:00:00','2025-02-21 11:00:00','Lixeira.','Conto na lixeira','','trash','conto-lixeira__trashed','2025-02-21 11:00:00','post'),(107,1,'2025-02-22 08:00:00','2025-02-22 11:00:00','Dica quente.','Dica Hot 1','','publish','dica-hot-1','2025-02-22 11:00:00','post'),(108,1,'2025-02-23 08:00:00','2025-02-23 11:00:00','Página institucional.','Uma página','','publish','uma-pagina','2025-02-23 11:00:00','page'),(109,1,'2025-01-10 10:30:00','2025-01-10 13:30:00','Revisão antiga do conto 101.','Conto clássico da maçã','','inherit','101-revision-v1','2025-01-10 13:30:00','revision'),(110,1,'2025-03-01 22:00:00','0000-00-00 00:00:00','Conto sem data GMT.\n\nOutro parágrafo, com \'aspas\' e ''duplicadas''.','Conto sem data GMT','','publish','conto-sem-gmt','0000-00-00 00:00:00','post');
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
INSERT INTO `wp26_terms` VALUES (1,'Sem categoria','sem-categoria',0),(2,'Contos','contos',0),(3,'Dicas Hot','dicas-hot',0),(4,'Post Dev','postdev',0),(5,'Contos (etiqueta)','contos',0);
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
INSERT INTO `wp26_term_taxonomy` VALUES (11,1,'category','',0,0),(12,2,'category','',0,6),(13,3,'category','',0,1),(14,4,'category','',0,1),(15,5,'post_tag','',0,1);
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
INSERT INTO `wp26_term_relationships` VALUES (101,12,0),(102,12,0),(103,12,0),(104,12,0),(104,14,0),(105,12,0),(106,12,0),(107,13,0),(107,15,0),(108,12,0),(109,12,0),(110,12,0);
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
INSERT INTO `wp26_postmeta` VALUES (1,101,'_edit_lock','1736500000:1'),(2,102,'_elementor_edit_mode','builder'),(3,103,'_members_access_role','subscriber'),(4,103,'_members_access_role','administrator'),(5,101,'_thumbnail_id','5'),(6,104,'_elementor_edit_mode',''),(7,104,'_elementor_data',NULL);
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
INSERT INTO `wp_posts` VALUES (1,'Conto do prefixo errado');
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-10 12:00:00
