import pino from 'pino';
export const logger = pino({ name: 'pi-agent', level: 'debug' });
