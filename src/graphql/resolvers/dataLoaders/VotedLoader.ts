import { Device, Phone, VoteModel } from '@democracy-deutschland/democracy-common';
import { Types } from 'mongoose';

export const votedLoader = async ({
  procedureObjIds,
  phone,
  device,
}: {
  procedureObjIds: readonly Types.ObjectId[];
  phone: Phone | null | undefined;
  device: Device | null | undefined;
}) => {
  if (phone) {
    const votedProcedures = await VoteModel.find({
      procedure: { $in: procedureObjIds },
      type: 'Phone',
      voters: {
        $elemMatch: {
          voter: phone._id,
        },
      },
    });
    const votedProcedureObjIds = votedProcedures.map(({ procedure }) =>
      (procedure as Types.ObjectId).toHexString(),
    );

    return procedureObjIds.map((procedureObjId) =>
      votedProcedureObjIds.includes(procedureObjId.toHexString()),
    );
  }
  return procedureObjIds.map(() => false);
};
