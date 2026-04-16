'''
Script pour améliorer les emojis dans la base de données weeks_db.
'''
import pandas as pd
import os

# Chemins
output_path = "/home/ubuntu/pregnancy-app-datasets/output/"
weeks_db_path = os.path.join(output_path, "weeks_db.csv")

# Lire la base de données existante
df = pd.read_csv(weeks_db_path)

# Mapping des emojis améliorés par semaine
emoji_mapping = {
    1: "🌱",   # Graine
    2: "🌱",   # Graine
    3: "🌱",   # Graine
    4: "🌱",   # Graine
    5: "🫘",   # Haricot
    6: "🫘",   # Haricot
    7: "🫘",   # Haricot
    8: "🫘",   # Haricot
    9: "🍋",   # Citron
    10: "🍋",  # Citron
    11: "🍋",  # Citron
    12: "🍋",  # Citron
    13: "🥑",  # Avocat
    14: "🥑",  # Avocat
    15: "🥑",  # Avocat
    16: "🥑",  # Avocat
    17: "🍐",  # Poire
    18: "🍐",  # Poire
    19: "🍐",  # Poire
    20: "🍐",  # Poire
    21: "🥭",  # Mangue
    22: "🥭",  # Mangue
    23: "🥭",  # Mangue
    24: "🥭",  # Mangue
    25: "🥥",  # Noix de coco
    26: "🥥",  # Noix de coco
    27: "🥥",  # Noix de coco
    28: "🥥",  # Noix de coco
    29: "🍉",  # Pastèque
    30: "🍉",  # Pastèque
    31: "🍉",  # Pastèque
    32: "🍉",  # Pastèque
    33: "🎃",  # Citrouille
    34: "🎃",  # Citrouille
    35: "🎃",  # Citrouille
    36: "🎃",  # Citrouille
    37: "👶",  # Bébé
    38: "👶",  # Bébé
    39: "👶",  # Bébé
    40: "👶",  # Bébé
}

# Mettre à jour les emojis
for week, emoji in emoji_mapping.items():
    df.loc[df['week_number'] == week, 'emoji'] = emoji

# Sauvegarder les fichiers mis à jour
df.to_csv(weeks_db_path, index=False, encoding='utf-8-sig')
df.to_json(os.path.join(output_path, "weeks_db.json"), orient='records', indent=2, force_ascii=False)

print("✅ Emojis améliorés avec succès dans weeks_db !")
print("\nExemples de changements :")
print(df[['week_number', 'emoji', 'title_fr']].head(10))
