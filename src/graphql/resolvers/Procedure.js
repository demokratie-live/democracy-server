export default {
  Query: {
    getProcedures: (parent, { offset = 0, pageSize = 20 }, { ProcedureModel }) => {
      console.log();
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return ProcedureModel.aggregate([
        { $match: { 'history.initiator': '2. Beratung' } },
        {
          $addFields: {
            order: {
              $filter: {
                input: '$history',
                as: 'p',
                cond: { $eq: ['$$p.initiator', '2. Beratung'] },
              },
            },
          },
        },
        { $sort: { order: -1 } },
        { $limit: pageSize + offset },
        { $skip: offset },
      ]).then(res => console.log(res));
    },
  },
};
