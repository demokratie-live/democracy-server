import { Response, Request } from 'express';
import ProcedureModel from '../models/Procedure';
import VoteModel from '../models/Vote';
import DeputyModel from '../models/Deputy';
import ActivityModel from '../models/Activity';
import SearchTermModel from '../models/SearchTerm';
import VerificationModel from '../models/Verification';
import PhoneModel from '../models/Phone';
import DeviceModel from '../models/Device';
import UserModel from '../models/User';
import { User } from '../migrations/1-schemas/User';
import { Device } from '../migrations/12-schemas/Device';
import { Phone } from '../migrations/3-schemas/Phone';

export interface GraphQlContext {
  ProcedureModel: typeof ProcedureModel;
  VoteModel: typeof VoteModel;
  ActivityModel: typeof ActivityModel;
  DeviceModel: typeof DeviceModel;
  DeputyModel: typeof DeputyModel;
  SearchTermModel: typeof SearchTermModel;
  PhoneModel: typeof PhoneModel;
  VerificationModel: typeof VerificationModel;
  UserModel: typeof UserModel;
  res: Response;
  user: User;
  phone: Phone;
  device: Device;
}

export interface ExpressReqContext extends Request {
  user?: User | null;
  phone?: Phone | null;
  device?: Device | null;
}
