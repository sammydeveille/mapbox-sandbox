const isDebug = process.env.LOG_LEVEL === 'debug';

export const log = {
  debug: (...args: any[]) => isDebug && console.log(...args),
  error: (...args: any[]) => console.error(...args),
  info: (...args: any[]) => console.log(...args),
};
