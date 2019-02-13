import { Schema } from 'mongoose';

const DeputyVoteSchema = new Schema(
  {
    procedureId: { type: String, required: true },
    decision: { type: String, enum: ['YES', 'NO', 'ABSTINATION', 'NOTVOTED'], required: true },
  },
  { _id: false },
);

export default DeputyVoteSchema;
