/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose from 'mongoose';
import PushNotificationSchema from '../migrations/3-schemas/PushNotification';

export default mongoose.model('PushNotification', PushNotificationSchema);
