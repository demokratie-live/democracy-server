import { MongooseFilterQuery } from 'mongoose';
import { ExtractDoc } from 'ts-mongoose';
import DeputyModel from '../../models/Deputy';
import {
  Resolvers,
  VoteSelection,
  Resolver,
  Maybe,
  ResolversTypes,
  DeputyProcedure,
  Procedure,
} from '../../generated/graphql';
import DeputySchema, { DeputyDoc } from '../../migrations/4-schemas/Deputy';

const DeputyApi: Resolvers = {
  Query: {
    deputiesOfConstituency: async (parent, { constituency, directCandidate = false }) => {
      const query: MongooseFilterQuery<DeputyDoc> = {
        constituency,
      };
      if (directCandidate) {
        // returns only directCandidate
        query.directCandidate = true;
      }
      return DeputyModel.find(query);
    },
  },
  Deputy: {
    totalProcedures: ({ votes }) => votes.length,
    procedures: async (
      { votes },
      { procedureIds, offset = 0, pageSize = 9999999 },
      { ProcedureModel },
      info,
    ) => {
      // get query property procedures
      const proceduresSelection = info.operation.selectionSet.selections[0].selectionSet.selections.find(
        ({ name: { value } }) => value === 'procedures',
      );
      let selectedProcedureFields = [];

      // check which fields are requrested for procedure
      if (proceduresSelection) {
        // get procedure selection query info
        const procedureSelection = proceduresSelection.selectionSet.selections.find(
          ({ name: { value } }) => value === 'procedure',
        );
        // get procedure fields selection query info
        selectedProcedureFields = procedureSelection.selectionSet.selections.map(
          ({ name: { value } }) => value,
        );
      }

      // if procedureIds is given filter procedures to given procedureIds
      const filteredVotes = votes.filter(({ procedureId: pId }) =>
        procedureIds ? procedureIds.includes(pId) : true,
      );

      // flattern procedureId's
      const procedureIdsSelected = filteredVotes.map(({ procedureId }) => procedureId);

      // get needed procedure Data only from votes object
      if (selectedProcedureFields.length === 1 && selectedProcedureFields[0] === 'procedureId') {
        const returnValue = filteredVotes
          .reduce((prev, { procedureId, decision }) => {
            const procedure = ProcedureModel.findOne({ procedureId });
            if (procedure) {
              const deputyProcedure = {
                procedure,
                decision,
              };

              return [...prev, deputyProcedure];
            }
            return prev;
          }, [])
          .slice(offset, offset + pageSize);
        return returnValue;
      }

      // if need more procedure data get procedure object from database
      const procedures = await ProcedureModel.find({ procedureId: { $in: procedureIdsSelected } })
        .sort({
          lastUpdateDate: -1,
          title: 1,
        })
        .limit(pageSize)
        .skip(offset)
        .map(p => {
          return p;
        });

      const result = await Promise.all(
        procedures.map(async procedure => {
          return {
            decision: (await filteredVotes.find(
              ({ procedureId }) => procedure.procedureId === procedureId,
            ).decision) as VoteSelection,
            procedure: { ...procedure.toObject(), activityIndex: undefined, voted: undefined },
          };
        }),
      );
      return result;
    },
  },
};

export default DeputyApi;
