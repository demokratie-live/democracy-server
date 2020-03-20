import { Schema } from 'mongoose';

const CronJobSchema = new Schema(
  {
    name: { type: String, unique: true, index: true, required: true },
    lastErrorDate: { type: Date, default: null },
    lastSuccessDate: { type: Date, default: null },
    lastSuccessStartDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export default CronJobSchema;
