// CLEANUP: ui/babyEvolution/support/article namespaces were duplicated in common.json
// (which is spread at root). The standalone .json files have been removed.
import authEn from './auth.json';
import commonEn from './common.json';
import profileEn from './profile.json';
import onboardingEn from './onboarding.json';
import addAppointmentEn from './add_appointment.json';
import calendarEn from './calendar.json';
import dashboardEn from './dashboard.json';
import weightEn from './weight.json';
import homeEn from './home.json';
import tasksEn from './tasks.json';
import remindersEn from './reminders.json';
import forbiddenFoodsEn from './forbiddenFoods.json';
import notificationsEn from './notifications.json';

import babyGrowthEn from './babyGrowth.json';
export default {
    ...authEn,
    ...commonEn,
    common: commonEn,
    profile: profileEn,
    onboarding: onboardingEn,
    addAppointment: addAppointmentEn,
    calendar: calendarEn,
    dashboard: dashboardEn,
    weight: weightEn,
    home: homeEn,
    tasks: tasksEn,
    reminders: remindersEn,
    forbiddenFoods: forbiddenFoodsEn,
    notifications: notificationsEn,

    babyGrowth: babyGrowthEn,
};
