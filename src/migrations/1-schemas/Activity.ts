/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { createSchema, Type, typedModel, ExtractDoc, ExtractProps } from 'ts-mongoose';
import CONFIG from '../../config';
import ProcedureSchema from '../11-schemas/Procedure';
import PhoneSchema from '../3-schemas/Phone';

const ActivitySchema = createSchema(
  {
    kind: Type.string({ type: String, required: true }),
    actor: Type.ref(Type.objectId()).to('Phone', PhoneSchema),
    procedure: Type.ref(Type.objectId()).to('Procedure', ProcedureSchema),
  },
  { timestamps: false },
);

export type ActivityDoc = ExtractDoc<typeof ActivitySchema>;
export type ActivityProps = ExtractProps<typeof ActivitySchema>;

ActivitySchema.index({ actor: 1, procedure: 1 }, { unique: true });

ActivitySchema.post<ActivityDoc>('save', async doc => {
  const procedureObjId = '_id' in doc.procedure ? doc.procedure._id : doc.procedure;
  const activities = await typedModel('Activity', ActivitySchema)
    .find({ procedure: procedureObjId, kind: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device' })
    .count();
  await typedModel('Procedure').findByIdAndUpdate(procedureObjId, { activities });
});

export default ActivitySchema;
