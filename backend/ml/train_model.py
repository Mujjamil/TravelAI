#!/usr/bin/env python3
"""
Travel Planner Bot - Custom NLP Model Trainer
Trains an Intent Classifier + Entity Extractor (no Dialogflow needed)

Architecture:
  - Intent Classification: TF-IDF Vectorizer + Linear SVM (best for text)
  - Entity Extraction: Rule-based regex patterns (fast + accurate)
  - Slot Filling: Custom parameter extractor
  - Confidence Scoring: Probability estimates via Platt scaling

Usage:
  python train_model.py
"""

import json
import re
import os
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(SCRIPT_DIR, 'data', 'training_data.json')
MODEL_DIR   = os.path.join(SCRIPT_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH    = os.path.join(MODEL_DIR, 'intent_classifier.pkl')
ENCODER_PATH  = os.path.join(MODEL_DIR, 'label_encoder.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')


def load_training_data(path):
    """Load and parse training data from JSON."""
    with open(path, 'r') as f:
        data = json.load(f)

    texts, labels = [], []
    for intent in data['intents']:
        for pattern in intent['patterns']:
            texts.append(pattern.lower().strip())
            labels.append(intent['tag'])

    print(f"✅ Loaded {len(texts)} training examples across {len(set(labels))} intents")
    return texts, labels


def augment_data(texts, labels):
    """
    Data augmentation: creates slight variations of training phrases
    to improve model generalization.
    """
    augmented_texts, augmented_labels = list(texts), list(labels)

    # Common synonym replacements
    replacements = {
        'plan': ['organize', 'arrange', 'schedule', 'book', 'set up'],
        'trip': ['vacation', 'holiday', 'journey', 'travel', 'visit'],
        'find': ['search', 'look for', 'show me', 'get', 'locate'],
        'recommend': ['suggest', 'advise', 'propose', 'give me'],
        'best': ['top', 'great', 'good', 'popular', 'recommended'],
        'cheap': ['affordable', 'budget', 'inexpensive', 'low cost'],
        'expensive': ['luxury', 'premium', 'high end', 'pricey'],
        'hotel': ['accommodation', 'place to stay', 'lodging', 'resort'],
        'flight': ['plane ticket', 'air ticket', 'airfare', 'fly'],
    }

    for i, (text, label) in enumerate(zip(texts, labels)):
        for word, synonyms in replacements.items():
            if word in text:
                for syn in synonyms[:2]:  # limit to 2 augmentations per word
                    new_text = text.replace(word, syn, 1)
                    if new_text != text:
                        augmented_texts.append(new_text)
                        augmented_labels.append(label)

    print(f"✅ Augmented to {len(augmented_texts)} examples")
    return augmented_texts, augmented_labels


def build_pipeline():
    """
    Build sklearn Pipeline:
      TF-IDF (char n-grams + word n-grams) → LinearSVC with Platt calibration
    """
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 3),        # unigrams, bigrams, trigrams
            max_features=15000,
            sublinear_tf=True,          # log normalization
            strip_accents='unicode',
            lowercase=True,
            min_df=1
        )),
        ('clf', CalibratedClassifierCV(
            LinearSVC(
                C=1.0,
                max_iter=2000,
                class_weight='balanced'  # handle class imbalance
            ),
            cv=3,
            method='sigmoid'             # Platt scaling for probability output
        ))
    ])
    return pipeline


def train(texts, labels):
    """Train the intent classifier pipeline."""
    le = LabelEncoder()
    y = le.fit_transform(labels)

    pipeline = build_pipeline()

    # Cross-validation to evaluate performance
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, texts, y, cv=cv, scoring='accuracy')

    print(f"\n📊 Cross-Validation Accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    print(f"   Per-fold: {[f'{s:.3f}' for s in cv_scores]}")

    # Train final model on all data
    pipeline.fit(texts, y)

    # Detailed classification report
    y_pred = pipeline.predict(texts)
    print("\n📋 Training Classification Report:")
    print(classification_report(y, y_pred, target_names=le.classes_))

    return pipeline, le


def save_model(pipeline, le, texts, labels):
    """Persist model artifacts to disk."""
    joblib.dump(pipeline, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)

    metadata = {
        'intents': list(le.classes_),
        'num_training_examples': len(texts),
        'num_intents': len(le.classes_),
        'confidence_threshold': 0.35,
        'model_type': 'TF-IDF + LinearSVC (Platt calibrated)',
        'version': '1.0.0'
    }
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✅ Model saved to: {MODEL_DIR}/")
    print(f"   - intent_classifier.pkl")
    print(f"   - label_encoder.pkl")
    print(f"   - model_metadata.json")


if __name__ == '__main__':
    print("🚀 Training Travel Planner NLP Model...\n")
    texts, labels = load_training_data(DATA_PATH)
    texts, labels = augment_data(texts, labels)
    pipeline, le = train(texts, labels)
    save_model(pipeline, le, texts, labels)
    print("\n🎉 Training complete! Model is ready.")
