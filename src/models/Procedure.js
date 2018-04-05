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
    lastUpdateDate: Date, // date of last dip21 history element for sorting in App
    bioUpdateAt: Date, // Date of last dip21 changes on bundestag.io
    subjectGroups: [String],
    importantDocuments: [Document],
    voteResults: {
      yes: { type: Number, required: true },
      no: { type: Number, required: true },
      abstination: { type: Number, required: true },
      notVote: { type: Number, required: true },
    },
  },
  { timestamps: true },
);

ProcedureSchema.index(
  {
    procedureId: 'text',
    title: 'text',
    abstract: 'text',
    tags: 'text',
    subjectGroups: 'text',
  },
  {
    name: 'searchIndex',
    default_language: 'german',
    weights: {
      title: 10,
      abstract: 5,
    },
  },
);

export default mongoose.model('Procedure', ProcedureSchema);

mongoose.model('Procedure').ensureIndexes((err) => {
  if (!err) {
    console.log('SearchIndexs for Procedures created');
  } else {
    console.log({ err });
  }
});
