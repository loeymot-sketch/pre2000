import uiAr from './ui.json';
import babyEvolutionAr from './babyEvolution.json';
import supportAr from './support.json';
import articleUar from './article.json';
import authAr from './auth.json';
import commonAr from './common.json';
import profileAr from './profile.json';
import onboardingAr from './onboarding.json';
import addAppointmentAr from './add_appointment.json';
import calendarAr from './calendar.json';
import dashboardAr from './dashboard.json';
import weightAr from './weight.json';
import homeAr from './home.json';
import tasksAr from './tasks.json';
import remindersAr from './reminders.json';
import forbiddenFoodsAr from './forbiddenFoods.json';
import notificationsAr from './notifications.json';

import babyGrowthAr from './babyGrowth.json';
export default {
    ...authAr,
    ...commonAr,
    common: commonAr,
    profile: profileAr,
    onboarding: onboardingAr,
    addAppointment: addAppointmentAr,
    calendar: calendarAr,
    dashboard: dashboardAr,
    weight: weightAr,
    home: homeAr,
    tasks: tasksAr,
    reminders: remindersAr,
    forbiddenFoods: forbiddenFoodsAr,
    notifications: notificationsAr,

    babyGrowth: babyGrowthAr,
};
