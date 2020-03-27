import mongoose, { Schema, Document, Types } from 'mongoose';
import CONFIG from '../../config';
import { Timestamps } from '../schemas/timestapms';
import { IProcedure } from '../11-schemas/Procedure';
import { User } from './User';

export interface Activity extends Document, Timestamps {
  kind: string;
  actor: User | Types.ObjectId;
  procedure: IProcedure | Types.ObjectId;
}

const ActivitySchema = new Schema<Activity>(
  {
    kind: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, refPath: 'kind', required: true },
    procedure: { type: Schema.Types.ObjectId, ref: 'Procedure', required: true },
  },
  { timestamps: false },
);

ActivitySchema.index({ actor: 1, procedure: 1 }, { unique: true });

ActivitySchema.post<Activity>('save', async doc => {
  const activities = await mongoose
    .model('Activity')
    .find({ procedure: doc.procedure, kind: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device' })
    .count();
  await mongoose.model('Procedure').findByIdAndUpdate(doc.procedure, { activities });
});

export default ActivitySchema;
