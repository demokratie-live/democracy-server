declare module NodeJS {
  import { Logger } from 'winston';

  interface Global {
    Log: Logger;
  }
}
