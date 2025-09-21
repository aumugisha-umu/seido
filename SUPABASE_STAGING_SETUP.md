# 🚀 Configuration Supabase Production - SEIDO App

## 📋 **Étapes de Configuration Production**

### **1. Création du Projet Supabase** 🏗️

#### **1.1 Accès à Supabase Dashboard**
```bash
# 1. Allez sur https://supabase.com/dashboard
# 2. Connectez-vous ou créez un compte
# 3. Cliquez "New Project"
```

#### **1.2 Configuration du Projet**
```
Nom du projet: seido-production
Organisation: [Votre organisation]
Region: West Europe (eu-west-1) ou closest to your users
Database Password: [Générer un mot de passe fort]
Plan: Free tier pour commencer, Pro si besoin de plus de ressources
```

#### **1.3 Attendre le Déploiement**
- ⏳ Le projet prend 2-3 minutes à se déployer
- ✅ Quand c'est prêt, vous verrez le dashboard du projet

### **2. Récupération des Clés** 🔑

#### **2.1 API Keys**
```bash
# Dans Supabase Dashboard > Settings > API
# Copiez ces valeurs :

Project URL: https://[your-project-id].supabase.co
anon key: eyJ... (longue clé publique)
service_role key: eyJ... (clé privée - NE PAS EXPOSER)
```

#### **2.2 Database URL**
```bash
# Dans Settings > Database
# Connection string:
postgresql://postgres:[password]@[host]:5432/postgres
```

### **3. Configuration Locale** ⚙️

#### **3.1 Fichier .env.local**
```bash
# Configuration pour production en ligne
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]...
```

### **4. Déploiement des Migrations** 🗄️

#### **4.1 Configuration CLI Supabase**
```bash
# Lier le projet local au projet distant
supabase link --project-ref [your-project-id]
# Entrer le mot de passe de la DB quand demandé
```

#### **4.2 Pousser les Migrations**
```bash
# Déployer les migrations vers la production
supabase db push
```

### **5. Vérification** ✅

#### **5.1 Test de Connexion**
```bash
# Vérifier que l'application peut se connecter
npm run dev
```

#### **5.2 Vérifications importantes**
```bash
# 1. L'application se lance sans erreurs
# 2. La connexion à la DB fonctionne
# 3. L'authentification fonctionne
```

### **6. Configuration de Sécurité** 🔒

#### **6.1 RLS (Row Level Security)**
- ✅ Vérifier que RLS est activé sur toutes les tables sensibles
- ✅ Tester les politiques de sécurité

#### **6.2 CORS et Domaines**
```bash
# Dans Auth > URL Configuration
# Ajouter vos domaines autorisés :
Site URL: https://votre-domaine.com
Additional Redirect URLs: 
- https://votre-domaine.com/auth/callback
- https://www.votre-domaine.com/auth/callback
```

### **7. Monitoring et Backup** 📊

#### **7.1 Monitoring**
- ✅ Configurer les alertes dans le dashboard Supabase
- ✅ Surveiller l'utilisation des ressources

#### **7.2 Backup**
- ✅ Les backups automatiques sont activés par défaut
- ✅ Configurer des backups manuels si nécessaire

## 🚨 **Points de Sécurité Importants**

1. **Ne jamais exposer les clés service_role** dans le frontend
2. **Utiliser HTTPS en production**
3. **Configurer RLS sur toutes les tables**
4. **Limiter les domaines autorisés**
5. **Surveiller les logs d'authentification**

## 📝 **Troubleshooting**

### Erreurs communes :
- **401 Unauthorized** : Vérifier les clés API et domaines
- **Connection timeout** : Vérifier la région du serveur
- **CORS errors** : Configurer les URL autorisées

### Support :
- Documentation : https://supabase.com/docs
- Community : https://github.com/supabase/supabase/discussions
