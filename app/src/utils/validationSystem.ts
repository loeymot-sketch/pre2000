import { z } from 'zod';

// Schémas de validation robustes pour chaque étape du quiz
export const nameValidationSchema = z.object({
  name: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le prénom ne peut contenir que des lettres")
});

export const personalInfoValidationSchema = z.object({
  age: z.number()
    .min(16, "Vous devez avoir au moins 16 ans")
    .max(120, "Âge invalide"),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: "Veuillez sélectionner votre genre"
  }),
  country: z.string()
    .min(2, "Veuillez sélectionner votre pays")
});

export const healthObjectivesValidationSchema = z.object({
  selectedObjectives: z.array(z.string())
    .min(1, "Veuillez sélectionner au moins un objectif")
    .max(5, "Maximum 5 objectifs peuvent être sélectionnés"),
  primaryObjective: z.string()
    .min(1, "Veuillez définir votre objectif principal")
});

export const symptomsValidationSchema = z.object({
  selectedSymptoms: z.array(z.object({
    id: z.string(),
    category: z.string(),
    intensity: z.number().min(1).max(5)
  })).min(1, "Veuillez sélectionner au moins un symptôme")
});

export const lifestyleValidationSchema = z.object({
  dietaryHabits: z.string().min(1, "Veuillez indiquer vos habitudes alimentaires"),
  activityLevel: z.string().min(1, "Veuillez indiquer votre niveau d'activité"),
  weight: z.number().min(30).max(300).nullable(),
  height: z.number().min(100).max(250).nullable(),
  sleepHours: z.number().min(3).max(12).nullable(),
  stressLevel: z.string().min(1, "Veuillez évaluer votre niveau de stress")
});

// Fonction de validation générique avec gestion d'erreurs
export function validateStepData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erreur de validation inconnue'] };
  }
}

// Validation complète du profil utilisateur
export function validateCompleteProfile(profileData: any): {
  isValid: boolean;
  missingSteps: string[];
  errors: string[];
} {
  const missingSteps: string[] = [];
  const errors: string[] = [];

  // Vérifier chaque étape
  if (!profileData.userName) {
    missingSteps.push('Nom');
  }

  if (!profileData.personalInfo) {
    missingSteps.push('Informations personnelles');
  } else {
    const personalInfoValidation = validateStepData(personalInfoValidationSchema, profileData.personalInfo);
    if (!personalInfoValidation.success) {
      errors.push(...(personalInfoValidation.errors || []));
    }
  }

  if (!profileData.healthObjectives) {
    missingSteps.push('Objectifs de santé');
  } else {
    const objectivesValidation = validateStepData(healthObjectivesValidationSchema, profileData.healthObjectives);
    if (!objectivesValidation.success) {
      errors.push(...(objectivesValidation.errors || []));
    }
  }

  if (!profileData.symptomsData) {
    missingSteps.push('Analyse des symptômes');
  } else {
    const symptomsValidation = validateStepData(symptomsValidationSchema, profileData.symptomsData);
    if (!symptomsValidation.success) {
      errors.push(...(symptomsValidation.errors || []));
    }
  }

  return {
    isValid: missingSteps.length === 0 && errors.length === 0,
    missingSteps,
    errors
  };
}

// Système de logging et analytics pour l'audit
export class QuizAnalytics {
  private static events: Array<{
    timestamp: number;
    event: string;
    step: string;
    data?: any;
  }> = [];

  static logEvent(event: string, step: string, data?: any) {
    this.events.push({
      timestamp: Date.now(),
      event,
      step,
      data
    });
    
    // En production, ces données seraient envoyées à un service d'analytics
    console.log(`📊 Analytics: ${event} at step ${step}`, data);
  }

  static logStepCompletion(step: string, duration: number) {
    this.logEvent('step_completed', step, { duration });
  }

  static logValidationError(step: string, errors: string[]) {
    this.logEvent('validation_error', step, { errors });
  }

  static logRecommendationGeneration(userProfile: any, recommendationsCount: number) {
    this.logEvent('recommendations_generated', 'analysis', {
      profileCompleteness: this.calculateProfileCompleteness(userProfile),
      recommendationsCount
    });
  }

  static getAnalyticsSummary() {
    return {
      totalEvents: this.events.length,
      completionRate: this.calculateCompletionRate(),
      averageSessionDuration: this.calculateAverageSessionDuration(),
      commonErrors: this.getCommonErrors()
    };
  }

  private static calculateProfileCompleteness(profile: any): number {
    const requiredFields = [
      'userName', 'personalInfo', 'healthObjectives', 
      'symptomsData', 'supplementExperience', 'lifestyleHabits'
    ];
    
    const completedFields = requiredFields.filter(field => profile[field] != null);
    return (completedFields.length / requiredFields.length) * 100;
  }

  private static calculateCompletionRate(): number {
    const startEvents = this.events.filter(e => e.event === 'quiz_started');
    const completionEvents = this.events.filter(e => e.event === 'quiz_completed');
    
    if (startEvents.length === 0) return 0;
    return (completionEvents.length / startEvents.length) * 100;
  }

  private static calculateAverageSessionDuration(): number {
    const sessions = new Map<string, { start?: number; end?: number }>();
    
    this.events.forEach(event => {
      const sessionId = 'session'; // En production, utiliser un vrai ID de session
      
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {});
      }
      
      const session = sessions.get(sessionId)!;
      
      if (event.event === 'quiz_started') {
        session.start = event.timestamp;
      } else if (event.event === 'quiz_completed') {
        session.end = event.timestamp;
      }
    });
    
    const completedSessions = Array.from(sessions.values())
      .filter(session => session.start && session.end)
      .map(session => session.end! - session.start!);
    
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, duration) => sum + duration, 0);
    return totalDuration / completedSessions.length / 1000 / 60; // en minutes
  }

  private static getCommonErrors(): string[] {
    const errorEvents = this.events.filter(e => e.event === 'validation_error');
    const errorCounts = new Map<string, number>();
    
    errorEvents.forEach(event => {
      if (event.data?.errors) {
        event.data.errors.forEach((error: string) => {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
      }
    });
    
    return Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);
  }
}