import PushNotification from '../models/PushNotification';
import { newVotes, newPreperations } from '../services/notifications';

export default async () => {
  const [
    newVotePushes,
    newProcedurePushes,
    //   updatedPushes
  ] = await Promise.all([
    PushNotification.find({ status: 'new', type: 'newVote' }),
    PushNotification.find({ status: 'new', type: 'new' }),
    PushNotification.find({ status: 'new', type: 'update' }),
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
  await PushNotification.update(
    {
      status: 'new',
    },
    { $set: { status: 'complete' } },
    { multi: true },
  );
};
