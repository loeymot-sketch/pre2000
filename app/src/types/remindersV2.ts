/**
 * Reminders V2.1.1 Types
 * 
 * Single source of truth for the reminder system.
 * Anti-duplication: Tasks and Reminders share UserSetting, different views.
 */

// ============================================
// TRILINGUAL SUPPORT
// ============================================

export interface Trilang {
    fr: string;
    ar: string;
    en: string;
    tn?: string;
}

// ============================================
// FREQUENCY & ORIGIN
// ============================================

export type FrequencyType = 'per_day' | 'per_week' | 'per_month' | 'one_off';
export type ReminderOrigin = 'preset' | 'custom' | 'migrated_custom';

/**
 * source_ui controls where the reminder appears:
 * - tasks_only: Only in Tasks page (action cards, no settings)
 * - reminders_only: Only in Reminders page (full control)
 * - both_but_single_entry: Both pages, controlled from Reminders
 */
export type SourceUI = 'tasks_only' | 'reminders_only' | 'both_but_single_entry';

// ============================================
// CONTEXT RULES (Adaptive System)
// ============================================

export interface NumComparator {
    lt?: number;   // less than
    lte?: number;  // less than or equal
    gt?: number;   // greater than
    gte?: number;  // greater than or equal
    eq?: number;   // equal
    in?: number[]; // in array
}

export interface ContextRuleWhen {
    trimester?: 1 | 2 | 3;
    week_of_pregnancy?: number | NumComparator;
    is_hot_season?: boolean;
    is_ramadan?: boolean;
    has_gestational_diabetes?: boolean;
    has_hypertension?: boolean;
    is_twins?: boolean;
    work_schedule?: 'home' | 'office' | 'shift';
}

export interface ContextRuleThen {
    override_intensity?: number;
    override_times?: string[];
    disable?: boolean;
    add_note?: Trilang;
}

export interface ContextRule {
    when: ContextRuleWhen;
    then: ContextRuleThen;
    priority: number; // 1 = highest priority
}

// ============================================
// CONTEXT PROFILE (Dynamic User State)
// ============================================

export interface ContextProfile {
    trimester: 1 | 2 | 3;
    week_of_pregnancy: number;
    is_hot_season: boolean;
    is_ramadan: boolean;
    has_gestational_diabetes?: boolean;
    has_hypertension?: boolean;
    is_twins?: boolean;
    work_schedule?: 'home' | 'office' | 'shift';
}

// ============================================
// REMINDER DEFINITION (Catalogue)
// ============================================

export interface ReminderDefinitionUI {
    icon?: string;
    essential_rank?: 1 | 2 | 3 | 4; // For sorting in "Essentials" block
    recommended_rank?: number; // P0.2: For "Recommandés cette semaine" sorting (lower = higher priority)
    section_group?: 'essential' | 'recommended' | 'medical' | 'wellbeing'; // For hierarchical grouping
}

export interface ReminderDefinition {
    id: string;
    category_id: string;
    title: Trilang;
    description: Trilang;
    default_enabled: boolean;
    frequency_type: FrequencyType;
    intensity_options: number[];
    preset_times: Record<number, string[]>; // intensity → hours "HH:mm"
    preset_days?: Record<number, number[]>; // intensity → days [1..7] (1=Monday)
    snooze_minutes_default?: number;
    snooze_count_max?: number;
    tips_linked_ids?: string[];
    linked_article_ids?: string[];
    sources?: string[];
    context_rules?: ContextRule[];
    source_ui: SourceUI;
    ui?: ReminderDefinitionUI;
    notification_messages?: Record<string, string[]>; // "fr" | "ar" | "en" → message templates
}

// ============================================
// REMINDER USER SETTING (Instance per user)
// ============================================

export interface ReminderUserSetting {
    reminder_id: string;
    user_id: string;
    enabled: boolean;
    intensity: number;
    times: string[]; // User's actual times (may differ from preset)
    days?: number[]; // User's actual days (if per_week/per_month)
    origin: ReminderOrigin;
    priority?: 'low' | 'normal' | 'high';
    last_modified_at: string; // ISO datetime
    // V2.2: Flexible customization
    custom_name?: string; // User's custom name for this reminder
    time_labels?: Record<string, string>; // Custom label per time slot {"09:00": "Vitamin C", "18:00": "Vitamin D"}
}

// ============================================
// NOTIFICATION STATE (Runtime tracking)
// ============================================

export interface NotificationState {
    reminder_id: string;
    snooze_count_current: number;
    last_triggered_at?: string;
    last_completed_at?: string;
    last_snoozed_at?: string;
}

// ============================================
// GROUPED NOTIFICATIONS (Anti-spam)
// ============================================

export interface GroupedNotificationReminder {
    reminder_id: string;
    title: Trilang;
    icon?: string;
}

export interface GroupedNotification {
    window_time: string; // "11:00"
    reminders: GroupedNotificationReminder[];
    body_text: Trilang;
}

// ============================================
// CATEGORY
// ============================================

export interface ReminderCategory {
    id: string;
    title: Trilang;
    icon: string;
    order: number;
}

// ============================================
// CATALOGUE (Full JSON structure)
// ============================================

export interface RemindersCatalogue {
    version: string;
    categories: ReminderCategory[];
    reminders: ReminderDefinition[];
}
