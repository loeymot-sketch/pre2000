/**
 * Analytics service to track quiz usage and recommendations
 */

class AnalyticsService {
  private isEnabled: boolean = true;
  private eventQueue: any[] = [];

  constructor() {
    // Initialize the analytics service
    console.log("Initializing analytics service");
    this.processQueue();
  }

  private processQueue() {
    if (this.eventQueue.length > 0) {
      console.log(`Processing ${this.eventQueue.length} queued analytics events`);
      // Process pending events
      this.eventQueue = [];
    }
  }

  // Suivre un événement générique
  trackEvent(eventName: string, eventData: any = {}) {
    if (!this.isEnabled) return;

    console.log(`Analytics event: ${eventName}`, eventData);
    this.eventQueue.push({
      type: eventName,
      data: eventData,
      timestamp: new Date().toISOString()
    });

    // Dans un environnement de production, on enverrait ces données à un service d'analytique
  }

  // Événements spécifiques pour le quiz
  trackQuizStart() {
    this.trackEvent('quiz_started');
  }

  trackQuizStep(stepName: string, stepData: any = {}) {
    this.trackEvent('quiz_step_completed', { 
      step: stepName,
      ...stepData
    });
  }

  trackQuizCompletion(quizData: any, timestamp: number) {
    this.trackEvent('quiz_completed', {
      processingTime: Date.now() - timestamp,
      dataPoints: Object.keys(quizData).length,
      hasSymptoms: quizData.symptoms && quizData.symptoms.length > 0,
      primaryGoal: quizData.goal
    });
  }

  // Suivi des recommandations
  trackRecommendationView(recommendationId: string) {
    this.trackEvent('recommendation_viewed', { recommendationId });
  }

  trackRecommendationFeedback(recommendationId: string, wasHelpful: boolean) {
    this.trackEvent('recommendation_feedback', { 
      recommendationId,
      wasHelpful
    });
  }

  // Activer/désactiver l'analytique
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.processQueue();
    }
  }
}

export const analyticsService = new AnalyticsService();