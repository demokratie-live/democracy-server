import mongoose, { Schema } from 'mongoose';

const ProcedureSchema = new Schema(
  {
    procedureId: { type: String, index: { unique: true } },
    type: { type: String, required: true },
    period: { type: Number, required: true },
    title: { type: String, required: true },
    currentStatus: String,
    abstract: String,
    tags: [String],
  },
  { timestamps: true },
);

export default mongoose.model('Procedure', ProcedureSchema);
