import Procedure from '../models/Procedure';
import Vote from '../models/Vote';
import User from '../models/User';
import Phone from '../models/Phone';
import Device from '../models/Device';
import { DeviceDoc } from '../migrations/12-schemas/Device';
import Deputy from '../models/Deputy';
import Activity from '../models/Activity';

export interface GraphQlContext {
  ProcedureModel: typeof Procedure;
  VoteModel: typeof Vote;
  ActivityModel: typeof Activity;
  DeviceModel: typeof Device;
  DeputyModel: typeof Deputy;
  user: typeof User;
  phone: typeof Phone;
  device: DeviceDoc;
}

export interface ExpressContext {
  user: typeof User;
  phone: typeof Phone;
  device: typeof Device;
}
