import { Type, createSchema, ExtractDoc, ExtractProps } from 'ts-mongoose';

const CronJobSchema = createSchema(
  {
    name: Type.string({ unique: true, index: true, required: true }),
    lastStartDate: Type.date({ default: null }),
    lastErrorDate: Type.date({ default: null }),
    lastError: Type.string({ default: null }),
    lastSuccessDate: Type.date({ default: null }),
    lastSuccessStartDate: Type.date({ default: null }),
    running: Type.boolean({ default: false }),
  },
  { timestamps: true },
);

export type CronJobDoc = ExtractDoc<typeof CronJobSchema>;
export type CronJobProps = ExtractProps<typeof CronJobSchema>;

export default CronJobSchema;
