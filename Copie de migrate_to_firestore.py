#!/usr/bin/env python3
"""
Script de migration des datasets CSV vers Firebase Firestore.

Prérequis:
    pip install firebase-admin pandas

Usage:
    python migrate_to_firestore.py --credentials path/to/serviceAccountKey.json
"""

import argparse
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any, List
import json

def parse_list_field(value: str) -> List[str]:
    """Parse un champ CSV contenant des IDs séparés par des virgules."""
    if pd.isna(value) or value == '':
        return []
    return [item.strip() for item in str(value).split(',')]

def parse_number_field(value: Any) -> float:
    """Parse un champ numérique, retourne 0 si vide."""
    if pd.isna(value) or value == '':
        return 0.0
    return float(value)

def migrate_weeks(db: firestore.Client, csv_path: str):
    """Migrer weeks_db.csv vers la collection 'weeks'."""
    print("📦 Migration de weeks_db...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        week_number = int(row['week_number'])
        doc_ref = db.collection('weeks').document(str(week_number))
        
        doc_data = {
            'weekNumber': week_number,
            'title': {
                'fr': str(row['title_fr']),
                'ar': str(row['title_ar']) if pd.notna(row['title_ar']) else '',
                'en': str(row['title_en']) if pd.notna(row['title_en']) else ''
            },
            'emoji': str(row['emoji']),
            'trimester': int(row['trimester']) if pd.notna(row['trimester']) else 1,
            'baby': {
                'sizeLabel': {
                    'fr': str(row['baby_size_label_fr']),
                    'ar': str(row['baby_size_label_ar']) if pd.notna(row['baby_size_label_ar']) else '',
                    'en': str(row['baby_size_label_en']) if pd.notna(row['baby_size_label_en']) else ''
                },
                'sizeCm': parse_number_field(row['baby_size_cm']),
                'weightG': parse_number_field(row['baby_weight_g']),
                'development': {
                    'fr': str(row['baby_dev_text_fr']),
                    'ar': str(row['baby_dev_text_ar']) if pd.notna(row['baby_dev_text_ar']) else '',
                    'en': str(row['baby_dev_text_en']) if pd.notna(row['baby_dev_text_en']) else ''
                },
                'imageUrl': str(row['baby_image_static_url']),
                'model3dUrl': str(row['baby_3d_model_url']) if pd.notna(row['baby_3d_model_url']) else ''
            },
            'mom': {
                'bodyText': {
                    'fr': str(row['mom_body_text_fr']),
                    'ar': str(row['mom_body_text_ar']) if pd.notna(row['mom_body_text_ar']) else '',
                    'en': str(row['mom_body_text_en']) if pd.notna(row['mom_body_text_en']) else ''
                },
                'warningsText': {
                    'fr': str(row['warnings_text_fr']),
                    'ar': str(row['warnings_text_ar']) if pd.notna(row['warnings_text_ar']) else '',
                    'en': str(row['warnings_text_en']) if pd.notna(row['warnings_text_en']) else ''
                }
            },
            'recommendations': {
                'articleIds': parse_list_field(row['recommended_articles_ids']),
                'supplementIds': parse_list_field(row['recommended_supplements_ids']),
                'calendarTemplateIds': parse_list_field(row['calendar_template_ids'])
            }
        }
        
        doc_ref.set(doc_data)
    
    print(f"✅ {len(df)} semaines migrées avec succès.")

def migrate_articles(db: firestore.Client, csv_path: str):
    """Migrer articles_db.csv vers la collection 'articles'."""
    print("📦 Migration de articles_db...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        article_id = str(row['article_id'])
        doc_ref = db.collection('articles').document(article_id)
        
        doc_data = {
            'articleId': article_id,
            'title': {
                'fr': str(row['title_fr']),
                'ar': str(row['title_ar']) if pd.notna(row['title_ar']) else '',
                'en': str(row['title_en']) if pd.notna(row['title_en']) else ''
            },
            'category': str(row['category']),
            'summary': {
                'fr': str(row['summary_fr']),
                'ar': str(row['summary_ar']) if pd.notna(row['summary_ar']) else '',
                'en': str(row['summary_en']) if pd.notna(row['summary_en']) else ''
            },
            'content': {
                'fr': str(row['content_markdown_fr']),
                'ar': str(row['content_markdown_ar']) if pd.notna(row['content_markdown_ar']) else '',
                'en': str(row['content_markdown_en']) if pd.notna(row['content_markdown_en']) else ''
            },
            'tags': parse_list_field(row['tags']),
            'author': str(row['author']),
            'sources': str(row['sources']),
            'imageUrl': str(row['image_url']),
            'relatedWeeks': [int(w) for w in parse_list_field(row['related_weeks']) if w.isdigit()],
            'relatedSupplementIds': parse_list_field(row['related_supplements_ids'])
        }
        
        doc_ref.set(doc_data)
    
    print(f"✅ {len(df)} articles migrés avec succès.")

def migrate_supplements(db: firestore.Client, csv_path: str):
    """Migrer supplements_pregnancy.csv vers la collection 'supplements'."""
    print("📦 Migration de supplements_pregnancy...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        supplement_id = str(row['supplement_id'])
        doc_ref = db.collection('supplements').document(supplement_id)
        
        doc_data = {
            'supplementId': supplement_id,
            'name': {
                'fr': str(row['name_fr']),
                'ar': str(row['name_ar']) if pd.notna(row['name_ar']) else '',
                'en': str(row['name_en']) if pd.notna(row['name_en']) else ''
            },
            'category': str(row['category']),
            'shortDescription': {
                'fr': str(row['short_description_fr']),
                'ar': str(row['short_description_ar']) if pd.notna(row['short_description_ar']) else '',
                'en': str(row['short_description_en']) if pd.notna(row['short_description_en']) else ''
            },
            'pregnancySafety': str(row['pregnancy_safety']),
            'pregnancyNotes': {
                'fr': str(row['pregnancy_notes_fr']),
                'ar': str(row['pregnancy_notes_ar']) if pd.notna(row['pregnancy_notes_ar']) else '',
                'en': str(row['pregnancy_notes_en']) if pd.notna(row['pregnancy_notes_en']) else ''
            },
            'typicalDose': {
                'fr': str(row['typical_dose_text_fr']),
                'ar': str(row['typical_dose_text_ar']) if pd.notna(row['typical_dose_text_ar']) else '',
                'en': str(row['typical_dose_text_en']) if pd.notna(row['typical_dose_text_en']) else ''
            },
            'precautions': {
                'fr': str(row['precautions_fr']),
                'ar': str(row['precautions_ar']) if pd.notna(row['precautions_ar']) else '',
                'en': str(row['precautions_en']) if pd.notna(row['precautions_en']) else ''
            },
            'sources': str(row['sources']),
            'relatedSymptomIds': parse_list_field(row['related_symptoms_ids']),
            'relatedArticleIds': parse_list_field(row['related_article_ids']),
            'localizationNotes': str(row['notes_localisation'])
        }
        
        doc_ref.set(doc_data)
    
    print(f"✅ {len(df)} compléments migrés avec succès.")

def migrate_red_flags(db: firestore.Client, csv_path: str):
    """Migrer red_flags_db.csv vers la collection 'redFlags'."""
    print("📦 Migration de red_flags_db...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        red_flag_id = str(row['red_flag_id'])
        doc_ref = db.collection('redFlags').document(red_flag_id)
        
        doc_data = {
            'redFlagId': red_flag_id,
            'label': {
                'fr': str(row['label_fr']),
                'ar': str(row['label_ar']) if pd.notna(row['label_ar']) else '',
                'en': str(row['label_en']) if pd.notna(row['label_en']) else ''
            },
            'keywords': {
                'fr': str(row['keywords_fr']),
                'ar': str(row['keywords_ar']) if pd.notna(row['keywords_ar']) else '',
                'en': str(row['keywords_en']) if pd.notna(row['keywords_en']) else ''
            },
            'severity': str(row['severity']),
            'standardMessage': {
                'fr': str(row['standard_message_fr']),
                'ar': str(row['standard_message_ar']) if pd.notna(row['standard_message_ar']) else '',
                'en': str(row['standard_message_en']) if pd.notna(row['standard_message_en']) else ''
            },
            'linkedArticleIds': parse_list_field(row['linked_articles_ids']),
            'sources': str(row['sources'])
        }
        
        doc_ref.set(doc_data)
    
    print(f"✅ {len(df)} red flags migrés avec succès.")

def migrate_calendar_templates(db: firestore.Client, csv_path: str):
    """Migrer calendar_templates_db.csv vers la collection 'calendarTemplates'."""
    print("📦 Migration de calendar_templates_db...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        template_id = str(row['template_id'])
        doc_ref = db.collection('calendarTemplates').document(template_id)
        
        doc_data = {
            'templateId': template_id,
            'title': {
                'fr': str(row['title_fr']),
                'ar': str(row['title_ar']) if pd.notna(row['title_ar']) else '',
                'en': str(row['title_en']) if pd.notna(row['title_en']) else ''
            },
            'description': {
                'fr': str(row['description_fr']),
                'ar': str(row['description_ar']) if pd.notna(row['description_ar']) else '',
                'en': str(row['description_en']) if pd.notna(row['description_en']) else ''
            },
            'type': str(row['type']),
            'weekMin': int(row['week_min']),
            'weekMax': int(row['week_max']),
            'importanceLevel': int(row['importance_level']),
            'countryScope': str(row['country_scope']),
            'sources': str(row['sources'])
        }
        
        doc_ref.set(doc_data)
    
    print(f"✅ {len(df)} templates de calendrier migrés avec succès.")

def main():
    parser = argparse.ArgumentParser(description='Migrer les datasets CSV vers Firestore')
    parser.add_argument('--credentials', required=True, help='Chemin vers le fichier serviceAccountKey.json')
    parser.add_argument('--data-dir', default='./output', help='Répertoire contenant les fichiers CSV')
    
    args = parser.parse_args()
    
    # Initialiser Firebase
    cred = credentials.Certificate(args.credentials)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    print("🚀 Début de la migration vers Firestore...")
    
    # Migrer tous les datasets
    migrate_weeks(db, f"{args.data_dir}/weeks_db.csv")
    migrate_articles(db, f"{args.data_dir}/articles_db.csv")
    migrate_supplements(db, f"{args.data_dir}/supplements_pregnancy.csv")
    migrate_red_flags(db, f"{args.data_dir}/red_flags_db.csv")
    migrate_calendar_templates(db, f"{args.data_dir}/calendar_templates_db.csv")
    
    print("\n🎉 Migration terminée avec succès !")

if __name__ == '__main__':
    main()
