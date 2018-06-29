import PushNotifiaction from '../models/PushNotifiaction';
import { newVotes, newPreperations } from '../services/notifications/index';

export default async () => {
  const [
    newVotePushes,
    newProcedurePushes,
    //   updatedPushes
  ] = await Promise.all([
    PushNotifiaction.find({ status: 'new', type: 'newVote' }),
    PushNotifiaction.find({ status: 'new', type: 'new' }),
    PushNotifiaction.find({ status: 'new', type: 'update' }),
  ]);

  if (newVotePushes.length > 0) {
    newVotes({
      procedureIds: [...new Set(newVotePushes.map(({ procedureId }) => procedureId))],
    });
  }
  if (newProcedurePushes.length > 0) {
    newPreperations({
      procedureIds: [...new Set(newProcedurePushes.map(({ procedureId }) => procedureId))],
    });
  }
  await PushNotifiaction.update(
    {
      status: 'new',
    },
    { $set: { status: 'complete' } },
    { multi: true },
  );
};
