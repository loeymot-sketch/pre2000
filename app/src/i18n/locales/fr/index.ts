// CLEANUP: ui/babyEvolution/support/article namespaces were duplicated in common.json
// (which is spread at root). The standalone .json files have been removed — common.json
// is now the single source of truth.
import authFr from './auth.json';
import commonFr from './common.json';
import profileFr from './profile.json';
import onboardingFr from './onboarding.json';
import addAppointmentFr from './add_appointment.json';
import calendarFr from './calendar.json';
import dashboardFr from './dashboard.json';
import weightFr from './weight.json';
import homeFr from './home.json';
import tasksFr from './tasks.json';
import babyGrowthFr from './babyGrowth.json';
import remindersFr from './reminders.json';
import forbiddenFoodsFr from './forbiddenFoods.json';
import notificationsFr from './notifications.json';



export default {
    ...authFr,
    ...commonFr,
    common: commonFr,
    profile: profileFr,
    onboarding: onboardingFr,
    addAppointment: addAppointmentFr,
    calendar: calendarFr,
    dashboard: dashboardFr,
    weight: weightFr,
    home: homeFr,
    tasks: tasksFr,
    babyGrowth: babyGrowthFr,
    reminders: remindersFr,
    forbiddenFoods: forbiddenFoodsFr,
    notifications: notificationsFr,


};
