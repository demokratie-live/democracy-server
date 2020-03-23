import { ExpressReqContext } from './graphqlContext';

declare namespace Express {
  export interface Request extends ExpressReqContext {}
}
