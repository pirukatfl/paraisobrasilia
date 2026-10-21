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

--
-- Table structure for table `wp26_users`
--

DROP TABLE IF EXISTS `wp26_users`;
CREATE TABLE `wp26_users` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_login` varchar(60) NOT NULL DEFAULT '',
  `user_pass` varchar(255) NOT NULL DEFAULT '',
  `user_nicename` varchar(50) NOT NULL DEFAULT '',
  `user_email` varchar(100) NOT NULL DEFAULT '',
  `user_url` varchar(100) NOT NULL DEFAULT '',
  `user_registered` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `user_activation_key` varchar(255) NOT NULL DEFAULT '',
  `user_status` int(11) NOT NULL DEFAULT 0,
  `display_name` varchar(250) NOT NULL DEFAULT '',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_users` WRITE;
INSERT INTO `wp26_users` VALUES (1,'admin_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','admin-sentinela','membro1.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Admin Sentinela'),(2,'membro2_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','membro-dois-sentinela','membro2.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Dois Sentinela'),(3,'membro3_sentinela','$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.','membro-tres-sentinela','membro3.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Tres Sentinela'),(4,'membro4_sentinela','$wp$2y$10$ZCyjg8Ai1fHJVHo4vpmju.MqB6nw24/NjZ9IiOXRF6VjB6zBH8Y..','membro-quatro-sentinela','membro4.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Quatro Sentinela'),(5,'membro5_sentinela','$P$BVN0C2LM5LrTtvTcnn9JecXDy8nUzK0','membro-cinco-sentinela','membro5.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Cinco Sentinela'),(6,'membro6_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','membro-seis-sentinela','membro6.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Seis Sentinela'),(7,'membro7_sentinela','$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.','membro-sete-sentinela','membro7.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Sete Sentinela'),(8,'teste_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','teste-sentinela','teste.sentinela@example.com','','2024-01-01 10:00:00','',0,'Teste Sentinela'),(9,'membro9_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','membro-nove-sentinela','sem-arroba-sentinela','','2024-01-01 10:00:00','',0,'Membro Nove Sentinela'),(10,'membro10_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','membro-dez-sentinela','MEMBRO2.SENTINELA@PARAISO-SINTETICO.TEST','','2024-01-01 10:00:00','',0,'Membro Dez Sentinela'),(11,'membro11_sentinela','5f4dcc3b5aa765d61d8327deb882cf99','membro-onze-sentinela','membro11.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Onze Sentinela'),(12,'membro12_sentinela','$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica','membro-doze-sentinela','membro12.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Ana Sentinela 61 99999-8888'),(13,'membro13_sentinela','$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.','membro-treze-sentinela','membro13.sentinela@paraiso-sintetico.test','','2024-01-01 10:00:00','',0,'Membro Treze Sentinela');
UNLOCK TABLES;

--
-- Table structure for table `wp26_usermeta`
--

DROP TABLE IF EXISTS `wp26_usermeta`;
CREATE TABLE `wp26_usermeta` (
  `umeta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `meta_key` varchar(255) DEFAULT NULL,
  `meta_value` longtext DEFAULT NULL,
  PRIMARY KEY (`umeta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_usermeta` WRITE;
INSERT INTO `wp26_usermeta` VALUES (1,1,'nickname','Apelido Sentinela 1'),(2,1,'billing_phone','61 98888-7777 Sentinela'),(3,1,'wp26_capabilities','a:1:{s:13:"administrator";b:1;}'),(4,1,'first_name','Nome Sentinela'),(5,2,'nickname','Apelido Sentinela 2'),(6,2,'billing_phone','61 98888-7777 Sentinela'),(7,2,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(8,2,'_expire_user_date','1794754800'),(9,2,'_expire_user_expired','N'),(10,2,'first_name','Nome Sentinela'),(11,3,'nickname','Apelido Sentinela 3'),(12,3,'billing_phone','61 98888-7777 Sentinela'),(13,3,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(14,3,'_expire_user_date','1803870000'),(15,3,'_expire_user_expired','Y'),(16,3,'first_name','Nome Sentinela'),(17,4,'nickname','Apelido Sentinela 4'),(18,4,'billing_phone','61 98888-7777 Sentinela'),(19,4,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(20,4,'first_name','Nome Sentinela'),(21,5,'nickname','Apelido Sentinela 5'),(22,5,'billing_phone','61 98888-7777 Sentinela'),(23,5,'wp26_capabilities','a:1:{s:12:"no_assinante";b:1;}'),(24,5,'_expire_user_date','1736521200'),(25,5,'_expire_user_expired','Y'),(26,5,'first_name','Nome Sentinela'),(27,6,'nickname','Apelido Sentinela 6'),(28,6,'billing_phone','61 98888-7777 Sentinela'),(29,6,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(30,6,'_expire_user_date','1790780400'),(31,6,'_expire_user_expired','Y'),(32,6,'first_name','Nome Sentinela'),(33,7,'nickname','Apelido Sentinela 7'),(34,7,'billing_phone','61 98888-7777 Sentinela'),(35,7,'wp26_capabilities','a:1:{s:12:"no_assinante";b:1;}'),(36,7,'first_name','Nome Sentinela'),(37,8,'nickname','Apelido Sentinela 8'),(38,8,'billing_phone','61 98888-7777 Sentinela'),(39,8,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(40,8,'first_name','Nome Sentinela'),(41,9,'nickname','Apelido Sentinela 9'),(42,9,'billing_phone','61 98888-7777 Sentinela'),(43,9,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(44,9,'first_name','Nome Sentinela'),(45,10,'nickname','Apelido Sentinela 10'),(46,10,'billing_phone','61 98888-7777 Sentinela'),(47,10,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(48,10,'first_name','Nome Sentinela'),(49,11,'nickname','Apelido Sentinela 11'),(50,11,'billing_phone','61 98888-7777 Sentinela'),(51,11,'wp26_capabilities','a:1:{s:10:"subscriber";b:1;}'),(52,11,'_expire_user_date','1796137200'),(53,11,'_expire_user_expired','N'),(54,11,'first_name','Nome Sentinela'),(55,12,'nickname','Apelido Sentinela 12'),(56,12,'billing_phone','61 98888-7777 Sentinela'),(57,12,'wp26_capabilities','a:1:{s:12:"no_assinante";b:1;}'),(58,12,'_expire_user_date','1797778800'),(59,12,'_expire_user_expired','N'),(60,12,'first_name','Nome Sentinela'),(61,13,'nickname','Apelido Sentinela 13'),(62,13,'billing_phone','61 98888-7777 Sentinela'),(63,13,'wp26_capabilities','a:2:{s:10:"subscriber";b:1;s:6:"editor";b:1;}'),(64,13,'first_name','Nome Sentinela');
UNLOCK TABLES;

--
-- Table structure for table `wp26_comments`
--

DROP TABLE IF EXISTS `wp26_comments`;
CREATE TABLE `wp26_comments` (
  `comment_ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `comment_post_ID` bigint(20) unsigned NOT NULL DEFAULT 0,
  `comment_author` tinytext NOT NULL,
  `comment_author_email` varchar(100) NOT NULL DEFAULT '',
  `comment_author_url` varchar(200) NOT NULL DEFAULT '',
  `comment_author_IP` varchar(100) NOT NULL DEFAULT '',
  `comment_date` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `comment_date_gmt` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `comment_content` text NOT NULL,
  `comment_karma` int(11) NOT NULL DEFAULT 0,
  `comment_approved` varchar(20) NOT NULL DEFAULT '1',
  `comment_agent` varchar(255) NOT NULL DEFAULT '',
  `comment_type` varchar(20) NOT NULL DEFAULT 'comment',
  `comment_parent` bigint(20) unsigned NOT NULL DEFAULT 0,
  `user_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`comment_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_comments` WRITE;
INSERT INTO `wp26_comments` VALUES (101,2894,'Membro Dois Sentinela','membro2.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-01 10:00:00','2025-05-01 13:00:00','<p>Casal Sentinela procura &amp; conversa 61 98888-7777</p>',0,'1','agente-sentinela','',0,2),(102,2894,'Membro Tres Sentinela','membro3.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-02 10:00:00','2025-05-02 13:00:00','Solteiro Sentinela<br />procura amizade',0,'1','agente-sentinela','comment',0,3),(103,2894,'Ana Sentinela','membro12.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-03 10:00:00','2025-05-03 13:00:00','<p>Solteira Sentinela</p>',0,'1','agente-sentinela','',0,12),(104,2894,'Membro Quatro Sentinela','membro4.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-04 10:00:00','2025-05-04 13:00:00','Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. Texto longo Sentinela sem contato. ',0,'1','agente-sentinela','',0,4),(105,2894,'Membro Dois Sentinela','membro2.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-05 10:00:00','2025-05-05 13:00:00','Resposta Sentinela',0,'1','agente-sentinela','',101,2),(106,2894,'Membro Seis Sentinela','membro6.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-06 10:00:00','2025-05-06 13:00:00','Pendente Sentinela',0,'0','agente-sentinela','',0,6),(107,2894,'Visitante Sentinela','visitante.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-07 10:00:00','2025-05-07 13:00:00','Visitante Sentinela',0,'1','agente-sentinela','',0,0),(108,2894,'Admin Sentinela','membro1.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-08 10:00:00','2025-05-08 13:00:00','Admin Sentinela casal',0,'1','agente-sentinela','',0,1),(109,2894,'Membro Sete Sentinela','membro7.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-09 10:00:00','2025-05-09 13:00:00','Outro Sentinela',0,'1','agente-sentinela','',0,7),(110,749,'Membro Dois Sentinela','membro2.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-10 10:00:00','2025-05-10 13:00:00','Mural Sentinela',0,'1','agente-sentinela','',0,2),(111,2894,'Membro Cinco Sentinela','membro5.sentinela@paraiso-sintetico.test','','192.0.2.1','2025-05-11 10:00:00','2025-05-11 13:00:00','Pingback Sentinela',0,'1','agente-sentinela','pingback',0,5);
UNLOCK TABLES;

--
-- Table structure for table `wp26_commentmeta`
--

DROP TABLE IF EXISTS `wp26_commentmeta`;
CREATE TABLE `wp26_commentmeta` (
  `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `comment_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `meta_key` varchar(255) DEFAULT NULL,
  `meta_value` longtext DEFAULT NULL,
  PRIMARY KEY (`meta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_commentmeta` WRITE;
INSERT INTO `wp26_commentmeta` VALUES (1,101,'custom_field_61a0e5b2c9f01','Casal'),(2,101,'custom_field_61a0e5b2c9f02','Brasília'),(3,102,'custom_field_61a0e5b2c9f01','Solteiro'),(4,102,'custom_field_61a0e5b2c9f02','Taguatinga'),(5,102,'wmu_attachments','a:1:{s:6:"images";a:2:{i:0;s:3:"501";i:1;i:502;}}'),(6,102,'akismet_result','false'),(7,103,'custom_field_61a0e5b2c9f01','Solteira'),(8,103,'custom_field_61a0e5b2c9f02','Brasília 61 9999'),(9,104,'custom_field_61a0e5b2c9f01','Casal'),(10,104,'custom_field_61a0e5b2c9f02','Gama'),(11,105,'custom_field_61a0e5b2c9f01','Casal'),(12,106,'custom_field_61a0e5b2c9f01','Solteiro'),(13,107,'custom_field_61a0e5b2c9f01','Solteira'),(14,108,'custom_field_61a0e5b2c9f01','Casal'),(15,108,'custom_field_61a0e5b2c9f02','Asa Norte'),(16,109,'custom_field_61a0e5b2c9f01','Outro'),(17,110,'custom_field_61a0e5b2c9f01','Casal'),(18,111,'custom_field_61a0e5b2c9f01','Casal');
UNLOCK TABLES;

--
-- Table structure for table `wp26_posts`
--

DROP TABLE IF EXISTS `wp26_posts`;
CREATE TABLE `wp26_posts` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_author` bigint(20) unsigned NOT NULL DEFAULT 0,
  `post_date` datetime NOT NULL,
  `post_date_gmt` datetime NOT NULL,
  `post_content` longtext NOT NULL,
  `post_title` text NOT NULL,
  `post_excerpt` text NOT NULL,
  `post_status` varchar(20) NOT NULL,
  `comment_status` varchar(20) NOT NULL,
  `ping_status` varchar(20) NOT NULL,
  `post_name` varchar(200) NOT NULL,
  `post_modified` datetime NOT NULL,
  `post_modified_gmt` datetime NOT NULL,
  `post_parent` bigint(20) unsigned NOT NULL DEFAULT 0,
  `menu_order` int(11) NOT NULL DEFAULT 0,
  `post_type` varchar(20) NOT NULL,
  `comment_count` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_posts` WRITE;
INSERT INTO `wp26_posts` VALUES (501,1,'2025-05-01 10:00:00','2025-05-01 13:00:00','','foto-sentinela','','inherit','open','closed','foto-sentinela','2025-05-01 13:00:00','2025-05-01 13:00:00',0,0,'attachment',0),(502,1,'2025-05-01 10:00:00','2025-05-01 13:00:00','','foto-sem-arquivo','','inherit','open','closed','foto-sem-arquivo','2025-05-01 13:00:00','2025-05-01 13:00:00',0,0,'attachment',0),(900,1,'2025-05-01 10:00:00','2025-05-01 13:00:00','','Formulário Sentinela','','publish','open','closed','form-sentinela','2025-05-01 13:00:00','2025-05-01 13:00:00',0,0,'wpdiscuz_form',0),(2894,1,'2025-05-01 10:00:00','2025-05-01 13:00:00','Página dos anúncios Sentinela','Classisex','','publish','open','closed','classisex1','2025-05-01 13:00:00','2025-05-01 13:00:00',0,0,'page',0);
UNLOCK TABLES;

--
-- Table structure for table `wp26_postmeta`
--

DROP TABLE IF EXISTS `wp26_postmeta`;
CREATE TABLE `wp26_postmeta` (
  `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `meta_key` varchar(255) DEFAULT NULL,
  `meta_value` longtext DEFAULT NULL,
  PRIMARY KEY (`meta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

LOCK TABLES `wp26_postmeta` WRITE;
INSERT INTO `wp26_postmeta` VALUES (1,501,'_wp_attached_file','2025/05/foto-sentinela.jpg'),(2,900,'wpdiscuz_form_structure','a:2:{s:26:"custom_field_61a0e5b2c9f01";a:3:{s:4:"type";s:6:"wpdFormAttr\\Field\\Select";s:4:"name";s:6:"Eu Sou";s:8:"required";s:1:"1";}s:26:"custom_field_61a0e5b2c9f02";a:2:{s:4:"type";s:4:"text";s:4:"name";s:6:"Cidade";}}'),(3,2894,'_edit_lock','123:1'),(4,2894,'wpdiscuz_something','x');
UNLOCK TABLES;
