import { logger, consoleTransport } from 'react-native-logs';

const defaultConfig = {
    severity: __DEV__ ? 'debug' : 'info',
    transport: [consoleTransport] as any,
    transportOptions: {
        colors: {
            debug: 'white',
            info: 'blueBright',
            warn: 'yellowBright',
            error: 'redBright',
        },
    },
    async: true,
    dateFormat: 'time',
    printLevel: true,
    printDate: true,
    enabled: true,
};

// Create the global logger
export const log = logger.createLogger(defaultConfig);

// Specific component/module loggers for cleaner tags
export const createComponentLogger = (componentName: string) => {
    return log.extend(componentName);
};
