import { createSchema, Type } from 'ts-mongoose';

const CronJobSchema = createSchema(
  {
    name: Type.string({ type: String, unique: true, index: true, required: true }),
    lastErrorDate: Type.date({ type: Date, default: null }),
    lastSuccessDate: Type.date({ type: Date, default: null }),
    lastSuccessStartDate: Type.date({ type: Date, default: null }),
  },
  { timestamps: true },
);

export default CronJobSchema;
