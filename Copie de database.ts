// types/database.ts
// Schémas TypeScript pour l'application de suivi de grossesse

/**
 * Texte localisé en français, arabe et anglais
 */
export interface LocalizedText {
  fr: string;
  ar: string;
  en: string;
}

/**
 * Données sur le développement du bébé
 */
export interface BabyData {
  sizeLabel: LocalizedText;
  sizeCm: number;
  weightG: number;
  development: LocalizedText;
  imageUrl: string;
  model3dUrl?: string;
}

/**
 * Données sur le corps et les symptômes de la maman
 */
export interface MomData {
  bodyText: LocalizedText;
  warningsText: LocalizedText;
}

/**
 * Recommandations de contenu liées à une semaine
 */
export interface Recommendations {
  articleIds: string[];
  supplementIds: string[];
  calendarTemplateIds: string[];
}

/**
 * Semaine de grossesse (1 à 40)
 */
export interface Week {
  weekNumber: number;
  title: LocalizedText;
  emoji: string;
  trimester: 1 | 2 | 3;
  baby: BabyData;
  mom: MomData;
  recommendations: Recommendations;
}

/**
 * Article thématique
 */
export interface Article {
  articleId: string;
  title: LocalizedText;
  category: string;
  summary: LocalizedText;
  content: LocalizedText;
  tags: string[];
  author: string;
  sources: string;
  imageUrl: string;
  relatedWeeks: number[];
  relatedSupplementIds: string[];
}

/**
 * Statut de sécurité d'un complément pendant la grossesse
 */
export type PregnancySafety = 'ok' | 'à_surveiller' | 'déconseillé';

/**
 * Complément alimentaire
 */
export interface Supplement {
  supplementId: string;
  name: LocalizedText;
  category: string;
  shortDescription: LocalizedText;
  pregnancySafety: PregnancySafety;
  pregnancyNotes: LocalizedText;
  typicalDose: LocalizedText;
  precautions: LocalizedText;
  sources: string;
  relatedSymptomIds: string[];
  relatedArticleIds: string[];
  localizationNotes: string;
}

/**
 * Niveau de gravité d'un symptôme d'alerte
 */
export type Severity = 'emergency' | 'urgent_consult';

/**
 * Symptôme d'alerte (red flag)
 */
export interface RedFlag {
  redFlagId: string;
  label: LocalizedText;
  keywords: LocalizedText;
  severity: Severity;
  standardMessage: LocalizedText;
  linkedArticleIds: string[];
  sources: string;
}

/**
 * Type d'événement de calendrier
 */
export type CalendarEventType = 'medical' | 'administratif' | 'self_care';

/**
 * Modèle d'événement de calendrier
 */
export interface CalendarTemplate {
  templateId: string;
  title: LocalizedText;
  description: LocalizedText;
  type: CalendarEventType;
  weekMin: number;
  weekMax: number;
  importanceLevel: 1 | 2 | 3;
  countryScope: string;
  sources: string;
}

/**
 * Événement de calendrier personnalisé pour un utilisateur
 */
export interface CalendarEvent extends CalendarTemplate {
  eventId: string;
  userId: string;
  scheduledWeek: number;
  scheduledDate: Date;
  completed: boolean;
  notes?: string;
}

/**
 * Profil utilisateur
 */
export interface UserProfile {
  userId: string;
  email: string;
  pregnancyStartDate: Date;
  currentWeek: number;
  dueDate: Date;
  preferredLanguage: 'fr' | 'ar' | 'en';
  notificationsEnabled: boolean;
  calendarEvents: CalendarEvent[];
}

/**
 * Message du chatbot
 */
export interface ChatMessage {
  messageId: string;
  userId: string;
  timestamp: Date;
  userMessage: string;
  botResponse: string;
  detectedRedFlags: string[];
  suggestedArticles: string[];
}

/**
 * Helpers pour récupérer le texte localisé
 */
export function getLocalizedText(
  text: LocalizedText,
  language: 'fr' | 'ar' | 'en'
): string {
  return text[language] || text.fr;
}

/**
 * Calculer la semaine de grossesse à partir de la date de début
 */
export function calculateCurrentWeek(pregnancyStartDate: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - pregnancyStartDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  return Math.min(Math.max(weeks, 1), 40);
}

/**
 * Calculer la date du terme (40 semaines)
 */
export function calculateDueDate(pregnancyStartDate: Date): Date {
  const dueDate = new Date(pregnancyStartDate);
  dueDate.setDate(dueDate.getDate() + 280); // 40 semaines = 280 jours
  return dueDate;
}
