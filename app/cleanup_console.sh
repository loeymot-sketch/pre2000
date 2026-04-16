#!/bin/bash

# Script de nettoyage Phase 1 - Pré-Lancement
# Supprime les console.log/warn de debug (garde console.error)

echo "🧹 PHASE 1 : NETTOYAGE PRÉ-LANCEMENT"
echo "===================================="
echo ""

# Comptage console.log avant
BEFORE=$(grep -r "console\.log\|console\.warn" src/ | wc -l | tr -d ' ')
echo "📊 console.log/warn trouvés : $BEFORE"

# Backup (sécurité)
echo "💾 Création backup..."
tar -czf ../backup_before_cleanup_$(date +%Y%m%d_%H%M%S).tar.gz src/

echo ""
echo "🔄 Suppression console.log/warn (garde console.error)..."

# Liste des fichiers à nettoyer
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    # Supprime lignes avec console.log ou console.warn
    # GARDE les console.error (importants pour debug production)
    sed -i.bak '/console\.log/d' "$file"
    sed -i.bak '/console\.warn/d' "$file"
    rm -f "$file.bak"
done

# Comptage après
AFTER=$(grep -r "console\.log\|console\.warn" src/ 2>/dev/null | wc -l | tr -d ' ')
REMOVED=$((BEFORE - AFTER))

echo ""
echo "✅ TERMINÉ !"
echo "   Supprimés : $REMOVED lignes"
echo "   Restants  : $AFTER lignes"
echo ""

# Vérification console.error gardés
ERRORS=$(grep -r "console\.error" src/ | wc -l | tr -d ' ')
echo "✅ console.error préservés : $ERRORS lignes (debug production)"
echo ""

# TypeScript check
echo "🔍 Vérification TypeScript..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript : 0 erreur"
else
    echo "⚠️  Erreurs TypeScript détectées, vérifier manuellement"
fi

echo ""
echo "🎉 Phase 1.1 (Cleanup console.log) COMPLÈTE"
echo "Backup créé : ../backup_before_cleanup_*.tar.gz"
