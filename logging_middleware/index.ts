export type Stack = 'backend' | 'frontend';

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type BackendPackage = 'cache' | 'controller' | 'cron_job' | 'db' | 'domain' | 'handler' | 'repository' | 'route' | 'service';
export type FrontendPackage = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';
export type CommonPackage = 'auth' | 'config' | 'middleware' | 'utils';

export type Package = BackendPackage | FrontendPackage | CommonPackage;

let _accessToken = '';

export const initLogger = (token: string) => {
    _accessToken = token;
};

export const Log = async (stack: Stack, level: Level, pkg: Package, message: string) => {
    if (!_accessToken) {
        console.warn('Logging Middleware: Access token is missing. Please call initLogger(token) first.');
        return;
    }

    try {
        const response = await fetch('http://4.224.186.213/evaluation-service/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${_accessToken}`
            },
            body: JSON.stringify({
                stack,
                level,
                package: pkg,
                message
            })
        });

        if (!response.ok) {
            console.error('Logging Middleware: Failed to send log', await response.text());
        }
    } catch (error) {
        console.error('Logging Middleware: Error sending log', error);
    }
};
