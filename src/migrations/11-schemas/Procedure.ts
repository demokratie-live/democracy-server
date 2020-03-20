import { createSchema, Type, ExtractDoc, ExtractProps } from 'ts-mongoose';

import procedureStates from '../../config/procedureStates';
import ProcedureDocument from '../3-schemas/Procedure/Document';
import { VoteSelection } from '../../generated/graphql';

const ProcedureSchema = createSchema(
  {
    procedureId: Type.string({ index: { unique: true } }),
    type: Type.string({ required: true }),
    period: Type.number({ required: true }),
    title: Type.string({ required: true }),
    currentStatus: Type.string(),
    currentStatusHistory: Type.array({ required: true }).of(Type.string({ required: true })),
    abstract: Type.string(),
    tags: Type.array({ required: true }).of(Type.string({ required: true })),
    voteDate: Type.date(),
    voteEnd: Type.date(),
    voteWeek: Type.number(),
    voteYear: Type.number(),
    sessionTOPHeading: Type.string(),
    submissionDate: Type.date(), // Date of the first dip21 history element
    lastUpdateDate: Type.date(), // Date of last dip21 history element for sorting in App
    bioUpdateAt: Type.date(), // Date of last dip21 changes on bundestag.io
    subjectGroups: Type.array({ required: true }).of(Type.string({ required: true })),
    importantDocuments: Type.array({ required: true }).of(ProcedureDocument),
    activities: Type.number({ default: 0 }), // cache from activity collection
    votes: Type.number({ default: 0 }), // cache from votes collection
    voteResults: Type.object().of({
      procedureId: Type.string(),
      yes: Type.number({ required: true }),
      no: Type.number({ required: true }),
      abstination: Type.number({ required: true }),
      notVoted: Type.number(),
      decisionText: Type.string(),
      namedVote: Type.boolean(),
      partyVotes: Type.array().of(
        Type.object().of({
          _id: false,
          party: Type.string({ required: true }),
          main: Type.string({
            enum: ['YES', 'NO', 'ABSTINATION', 'NOTVOTED'],
            required: true,
          }) as VoteSelection,

          deviants: Type.object().of({
            yes: Type.number({ required: true }),
            no: Type.number({ required: true }),
            abstination: Type.number({ required: true }),
            notVoted: Type.number(),
          }),
        }),
      ),
    }),
    ...({} as {
      isCompleted: () => boolean;
      voteResults: {
        procedureId: string;
      };
    }),
  },
  { timestamps: true },
);

ProcedureSchema.methods = {
  isCompleted(): boolean {
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

export type ProcedureDoc = ExtractDoc<typeof ProcedureSchema>;
export type ProcedureProps = ExtractProps<typeof ProcedureSchema> & {
  active?: boolean;
  voted?: boolean;
};

export default ProcedureSchema;
