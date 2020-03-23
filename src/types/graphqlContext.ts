import { Response, Request } from 'express';
import Procedure from '../models/Procedure';
import Vote from '../models/Vote';
import User from '../models/User';
import { UserDoc } from '../migrations/1-schemas/User';
import Phone from '../models/Phone';
import Device from '../models/Device';
import { DeviceDoc } from '../migrations/12-schemas/Device';
import Deputy from '../models/Deputy';
import Activity from '../models/Activity';
import SearchTerm from '../models/SearchTerm';
import Verification from '../models/Verification';
import { PhoneDoc } from '../migrations/3-schemas/Phone';

export interface GraphQlContext {
  ProcedureModel: typeof Procedure;
  VoteModel: typeof Vote;
  ActivityModel: typeof Activity;
  DeviceModel: typeof Device;
  DeputyModel: typeof Deputy;
  SearchTermModel: typeof SearchTerm;
  PhoneModel: typeof Phone;
  VerificationModel: typeof Verification;
  UserModel: typeof User;
  res: Response;
  user: typeof User & UserDoc;
  phone: typeof Phone;
  device: DeviceDoc;
}

export interface ExpressReqContext extends Request {
  user: UserDoc;
  phone: PhoneDoc;
  device: DeviceDoc;
}
