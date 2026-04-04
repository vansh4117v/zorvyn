const winston = require("winston");

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return stack
    ? `${timestamp} [${level}]: ${message}\n${stack}`
    : `${timestamp} [${level}]: ${message}`;
});

const isLocalEnv = !process.env.VERCEL && process.env.NODE_ENV !== "production";

const transports = [
  new winston.transports.Console({
    format: combine(colorize(), logFormat),
  }),
];

const exceptionHandlers = [new winston.transports.Console()];
const rejectionHandlers = [new winston.transports.Console()];

if (isLocalEnv) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  );
  exceptionHandlers.push(new winston.transports.File({ filename: "logs/exceptions.log" }));
  rejectionHandlers.push(new winston.transports.File({ filename: "logs/rejections.log" }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "http",
  silent: process.env.NODE_ENV === "test",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports,
  exceptionHandlers,
  rejectionHandlers,
});

module.exports = logger;
