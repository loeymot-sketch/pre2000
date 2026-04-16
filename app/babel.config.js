module.exports = function (api) {
    api.cache(true);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Strip console.log/warn/debug in production builds for performance and security
            // We keep console.error so crash trackers can still see critical errors
            ...(isProduction
                ? [['transform-remove-console', { exclude: ['error'] }]]
                : []
            ),
        ],
    };
};
