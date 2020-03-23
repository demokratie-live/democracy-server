import winston from 'winston';
import Discord from 'discord.js';
import DiscordTransport from 'winston-discordjs';

import CONFIG from '../../config';

const alignedWithColorsAndTime = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => {
    const { timestamp, level, message, ...args } = info;
    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message} ${
      Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
    }`;
  }),
);
const alignedWithTime = winston.format.combine(
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => {
    const { timestamp, level, message, ...args } = info;

    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message} ${
      Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
    }`;
  }),
);

const transports = [
  new winston.transports.Console({
    level: CONFIG.LOGGING_CONSOLE,
    format: alignedWithColorsAndTime,
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    level: CONFIG.LOGGING_FILE,
    format: alignedWithTime,
  }),
];
let discordLogger: DiscordTransport | undefined;
if (CONFIG.LOGGING_DISCORD && CONFIG.LOGGING_DISCORD_TOKEN) {
  const client = new Discord.Client();
  client.login(CONFIG.LOGGING_DISCORD_TOKEN);
  discordLogger = new DiscordTransport({
    discordChannel: 'internal',
    level: 'silly',
  });
  client.on('ready', () => {
    console.info(`DISCORD BOT Logged in as ${client.user.tag}!`);
  });
}
const myLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    import: 4,
    jwt: 5,
    graphql: 6,
    verbose: 7,
    debug: 8,
    silly: 9,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    notification: 'magenta',
    import: 'magenta',
    jwt: 'magenta',
    graphql: 'magenta',
    verbose: 'blue',
    debug: 'blue',
    silly: 'gray',
  },
};

const logger = winston.createLogger({
  levels: myLevels.levels,
  transports,
});
if (discordLogger) {
  logger.add(discordLogger);
}
winston.addColors(myLevels.colors);

global.Log = logger;
