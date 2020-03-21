import { Type, createSchema } from 'ts-mongoose';
import procedureStates from '../../config/procedureStates';
import ProcedureDocument from '../3-schemas/Procedure/Document';

const ProcedureSchema = createSchema(
  {
    procedureId: Type.string({ index: { unique: true } }),
    type: Type.string({ required: true }),
    period: Type.number({ required: true }),
    title: Type.string({ required: true }),
    currentStatus: Type.string(),
    currentStatusHistory: Type.array({ required: true }).of(Type.string({ required: true })),
    abstract: Type.string(),
    tags: Type.array().of(Type.string()),
    voteDate: Type.date(),
    voteEnd: Type.date(),
    voteWeek: Type.number(),
    voteYear: Type.number(),
    sessionTOPHeading: Type.string(),
    submissionDate: Type.date(), // Date of the first dip21 history element
    lastUpdateDate: Type.date(), // Date of last dip21 history element for sorting in App
    bioUpdateAt: Type.date(), // Date of last dip21 changes on bundestag.io
    subjectGroups: Type.array().of(Type.string()),
    importantDocuments: Type.array().of(Type.schema().of(ProcedureDocument)),
    activities: Type.number({ default: 0 }),
    voteResults: {
      procedureId: Type.string(),
      yes: Type.number({ required: true }),
      no: Type.number({ required: true }),
      abstination: Type.number({ required: true }),
      notVoted: Type.number(),
      decisionText: Type.string(),
      namedVote: Type.boolean(),
      partyVotes: Type.array().of({
        _id: false,
        party: Type.string({ required: true }),
        main: Type.string({
          enum: ['YES', 'NO', 'ABSTINATION', 'NOTVOTED'],
          required: true,
        }),

        deviants: {
          yes: Type.number({ required: true }),
          no: Type.number({ required: true }),
          abstination: Type.number({ required: true }),
          notVoted: Type.number(),
        },
      }),
    },
  },
  { timestamps: true },
);

ProcedureSchema.methods = {
  isCompleted() {
    return this.voteDate || procedureStates.COMPLETED.some(s => s === this.currentStatus);
  },
};

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

ProcedureSchema.index({ voteDate: -1 }, { background: true });
ProcedureSchema.index({ period: -1 }, { background: true });

export default ProcedureSchema;
