/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose from 'mongoose';
import {default as PushNotificationSchema, PUSH_TYPE as PT, PUSH_CATEGORY as PC, PUSH_OS as PO} from '../migrations/8-schemas/PushNotification';

export const PUSH_TYPE = PT;
export const PUSH_CATEGORY = PC;
export const PUSH_OS = PO;

export default mongoose.model('PushNotification', PushNotificationSchema);