/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const ActivitySchema = new Schema(
  {
    kind: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, refPath: 'kind', required: true },
    procedure: { type: Schema.Types.ObjectId, ref: 'Procedure', required: true },
  },
  { timestamps: false },
);

ActivitySchema.index({ actor: 1, procedure: 1 }, { unique: true });

ActivitySchema.post('save', async (doc) => {
  const activities = await mongoose
    .model('Activity')
    .find({ procedure: doc.procedure._id })
    .count();
  await mongoose.model('Procedure').findByIdAndUpdate(doc.procedure._id, { activities });
});

export default mongoose.model('Activity', ActivitySchema);
