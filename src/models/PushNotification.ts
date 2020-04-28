import { typedModel } from 'ts-mongoose';
import PushNotificationSchema, {
  PUSH_TYPE as PT,
  PUSH_CATEGORY as PC,
  PUSH_OS as PO,
} from '../migrations/8-schemas/PushNotification';

export const PUSH_TYPE = PT;
export const PUSH_CATEGORY = PC;
export const PUSH_OS = PO;

export default typedModel('PushNotification', PushNotificationSchema);
