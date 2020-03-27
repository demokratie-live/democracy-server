import { MongooseFilterQuery } from 'mongoose';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import DeputyModel from '../../models/Deputy';
import { Resolvers, VoteSelection } from '../../generated/graphql';
import { DeputyDoc } from '../../migrations/4-schemas/Deputy';

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
      const requestedFields = parseResolveInfo(info);
      let didRequestProcedureId = false;
      if (
        requestedFields &&
        requestedFields.name === 'procedures' &&
        'procedure' in requestedFields.fieldsByTypeName.DeputyProcedure &&
        'procedureId' in
          requestedFields.fieldsByTypeName.DeputyProcedure.procedure.fieldsByTypeName.Procedure
      ) {
        didRequestProcedureId = true;
      }

      // if procedureIds is given filter procedures to given procedureIds
      const filteredVotes = votes.filter(({ procedureId: pId }) =>
        procedureIds ? procedureIds.includes(pId) : true,
      );

      // flattern procedureId's
      const procedureIdsSelected = filteredVotes.map(({ procedureId }) => procedureId);

      // get needed procedure Data only from votes object
      if (didRequestProcedureId) {
        const returnValue = filteredVotes.reduce<any>((prev, { procedureId, decision }) => {
          const procedure = ProcedureModel.findOne({ procedureId });
          if (procedure) {
            const deputyProcedure = {
              procedure,
              decision: decision as VoteSelection,
            };

            return [...prev, deputyProcedure];
          }
          return prev;
        }, []);
        // .slice(offset, offset + pageSize);
        return returnValue;
      }

      if (!offset) {
        offset = 0;
      }

      // if need more procedure data get procedure object from database
      const procedures = await ProcedureModel.find({ procedureId: { $in: procedureIdsSelected } })
        .sort({
          lastUpdateDate: -1,
          title: 1,
        })
        .limit(pageSize || 9999999)
        .skip(offset)
        .map(p => {
          return p;
        });

      const result = await Promise.all(
        procedures.map(async procedure => {
          const p = await filteredVotes.find(
            ({ procedureId }) => procedure.procedureId === procedureId,
          );
          return {
            decision: p?.decision as VoteSelection,
            procedure: { ...procedure.toObject(), activityIndex: undefined, voted: undefined },
          };
        }),
      );
      return result;
    },
  },
};

export default DeputyApi;
