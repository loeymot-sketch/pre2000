const fs = require('fs');
const path = require('path');

const locales = ['fr', 'en', 'ar'];
const basePath = path.join(__dirname, '../src/i18n/locales');

const newStrings = {
    fr: {
        "appointmentsToday": "Aujourd'hui : {{count}} rendez-vous !",
        "appointmentsTomorrow": "N'oubliez pas ! {{count}} rendez-vous demain.",
        "appointmentsWeek": "Vous avez {{count}} rendez-vous prévus cette semaine.",
        "tasksToday": "{{count}} tâche(s) à faire aujourd'hui.",
        "tasksImportant": "{{count}} tâche(s) importante(s) en attente.",
        "tasksOngoing": "Vous avez {{count}} tâche(s) en cours."
    },
    en: {
        "appointmentsToday": "Today: {{count}} appointment(s)!",
        "appointmentsTomorrow": "Don't forget! {{count}} appointment(s) tomorrow.",
        "appointmentsWeek": "You have {{count}} appointment(s) scheduled this week.",
        "tasksToday": "{{count}} task(s) to do today.",
        "tasksImportant": "{{count}} important task(s) pending.",
        "tasksOngoing": "You have {{count}} ongoing task(s)."
    },
    ar: {
        "appointmentsToday": "اليوم: {{count}} موعد!",
        "appointmentsTomorrow": "لا تنس! {{count}} موعد غداً.",
        "appointmentsWeek": "لديك {{count}} موعد مقرر هذا الأسبوع.",
        "tasksToday": "{{count}} مهمة للقيام بها اليوم.",
        "tasksImportant": "{{count}} مهمة هامة قيد الانتظار.",
        "tasksOngoing": "لديك {{count}} مهمة جارية."
    }
};

locales.forEach(locale => {
    const filePath = path.join(basePath, locale, 'home.json');
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Remove string 'reminders' before adding object 'reminders'
        delete data.reminders;
        data.reminders = { ...newStrings[locale] };
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log(`Updated ${locale}/home.json`);
    } else {
        console.log(`File missing: ${filePath}`);
    }
});
