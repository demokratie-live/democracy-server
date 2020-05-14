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
import { RequestUser } from '../express/auth';

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
  user: RequestUser;
  phoneId: string;
  deviceId: string;
}

export interface ExpressReqContext extends Request {
  user?: RequestUser | null;
  phoneId?: string | null;
  deviceId?: string | null;
}
