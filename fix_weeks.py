#!/usr/bin/env python3
"""
Deep corrections for weeks_db.json based on user's detailed audit.
Corrects both emoji AND baby_size_label_fr to be consistent.
"""
import json

with open('weeks_db.json', 'r', encoding='utf-8') as f:
    weeks = json.load(f)

# DEEP CORRECTIONS: (emoji, baby_size_label_fr)
# Based on user's detailed feedback and emoji availability
CORRECTIONS = {
    # Premier trimestre - VALIDATED
    1: ("🌱", "Microscopique"),
    2: ("🌱", "Microscopique"),
    3: ("🌱", "Microscopique"),
    
    # Week 4-6: Tiny seeds - use 🫛 (pea pod = legume/tiny round thing)
    4: ("🫛", "Graine de pavot (1 mm)"),
    5: ("🫛", "Graine de sésame (2 mm)"),
    6: ("🫛", "Lentille (4 mm)"),
    
    # Week 7-9: Small berries/fruits
    7: ("🫐", "Myrtille (8 mm)"),       # ✅ perfect
    8: ("🫐", "Framboise (1,6 cm)"),    # 🫐 = closest to raspberry (no raspberry emoji)
    9: ("🫒", "Olive (2,3 cm)"),        # ✅ perfect
    
    # Week 10-13: Fruits  
    10: ("🍒", "Cerise (3,1 cm)"),      # Changed to cherry
    11: ("🍇", "Figue (4,1 cm)"),       # 🍇 = closest to fig
    12: ("🍈", "Citron vert (5,4 cm)"), # 🍈 green for lime (🍋=yellow)
    13: ("🍑", "Pêche (7,4 cm)"),       # ✅ perfect
    
    # Deuxième trimestre
    14: ("🍋", "Citron (8,7 cm)"),      # ✅ lemon
    15: ("🍎", "Pomme (10,1 cm)"),      # ✅ apple
    16: ("🥑", "Avocat (11,6 cm)"),     # ✅
    17: ("🥑", "Avocat (13 cm)"),       # ✅
    18: ("🥭", "Mangue (14,2 cm)"),     # ✅
    19: ("🥭", "Mangue (15,3 cm)"),     # mangue (no papaya emoji)
    20: ("🍌", "Banane (16,4 cm)"),     # ✅
    21: ("🥕", "Carotte (26,7 cm)"),    # ✅
    22: ("🥭", "Papaye (27,8 cm)"),     # 🥭 = closest to papaya
    23: ("🍆", "Aubergine (28,9 cm)"),  # ✅
    24: ("🌽", "Épi de maïs (30 cm)"),  # ✅
    25: ("🥦", "Brocoli (34,6 cm)"),    # 🥦 is broccoli, not cauliflower
    26: ("🥬", "Chou (35,6 cm)"),       # ✅
    
    # Troisième trimestre
    27: ("🥬", "Chou-rave (36,6 cm)"),
    28: ("🍍", "Ananas (37,6 cm)"),     # ✅
    29: ("🎃", "Courge (38,6 cm)"),     # generic squash
    30: ("🥬", "Chou chinois (39,9 cm)"), # ✅ bok choy
    31: ("🥥", "Noix de coco (41,1 cm)"), # ✅
    32: ("🥒", "Concombre (42,4 cm)"),  # ✅ cucumber
    33: ("🍍", "Ananas (43,7 cm)"),     # ✅
    34: ("🍈", "Melon (45 cm)"),        # ✅
    35: ("🍈", "Melon (46,2 cm)"),      # ✅
    36: ("🥬", "Laitue romaine (47,4 cm)"), # leafy = approximation
    37: ("🥬", "Bette à carde (48,6 cm)"), # leafy = approximation
    38: ("🍉", "Pastèque (49,8 cm)"),   # ✅
    39: ("🍉", "Pastèque (50,7 cm)"),   # ✅
    40: ("🍉", "Pastèque (51,2 cm)"),   # ✅
}

changes = []
for week in weeks:
    week_num = week.get('week_number')
    if week_num in CORRECTIONS:
        new_emoji, new_label = CORRECTIONS[week_num]
        old_emoji = week.get('emoji', '')
        old_label = week.get('baby_size_label_fr', '')
        
        changed_emoji = old_emoji != new_emoji
        changed_label = old_label != new_label
        
        if changed_emoji:
            week['emoji'] = new_emoji
        if changed_label:
            week['baby_size_label_fr'] = new_label
        
        if changed_emoji or changed_label:
            changes.append(f"Sem {week_num}: {old_emoji}→{new_emoji} | {old_label} → {new_label}")

with open('weeks_db.json', 'w', encoding='utf-8') as f:
    json.dump(weeks, f, indent=2, ensure_ascii=False)

print(f"✅ Applied {len(changes)} deep corrections:")
for c in changes:
    print(f"  {c}")
