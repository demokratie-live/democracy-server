import mongoose, { Schema } from 'mongoose';

import Document from './Schemas/Document';

const ProcedureSchema = new Schema(
  {
    procedureId: { type: String, index: { unique: true } },
    type: { type: String, required: true },
    period: { type: Number, required: true },
    title: { type: String, required: true },
    currentStatus: String,
    abstract: String,
    tags: [String],
    state: {
      type: String,
      required: true,
      enum: ['preparation', 'voting', 'past'],
    },
    voteDate: Date,
    submissionDate: Date,
    lastUpdateDate: Date,
    subjectGroups: [String],
    importantDocuments: [Document],
  },
  { timestamps: true },
);

export default mongoose.model('Procedure', ProcedureSchema);
