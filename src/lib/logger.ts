type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const consoleRef = globalThis.console
const shouldLog = import.meta.env.DEV || import.meta.env.MODE === 'test'

function write(level: LogLevel, message: string, ...context: unknown[]) {
  if (!shouldLog) return
  const logMethod = consoleRef[level] ?? consoleRef.log
  logMethod(`[mendjahit] ${message}`, ...context)
}

export const logger = {
  debug(message: string, ...context: unknown[]) {
    write('debug', message, ...context)
  },
  info(message: string, ...context: unknown[]) {
    write('info', message, ...context)
  },
  warn(message: string, ...context: unknown[]) {
    write('warn', message, ...context)
  },
  error(message: string, ...context: unknown[]) {
    write('error', message, ...context)
  },
}

