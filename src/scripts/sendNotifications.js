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
  //   console.log({ newVotePushes, newProcedurePushes, updatedPushes });
  console.log(newVotePushes);
  if (newVotePushes.length > 0) {
    newVotes({ procedureIds: newVotePushes.map(({ procedureId }) => procedureId) });
  }
  if (newProcedurePushes.length > 0) {
    newPreperations({ procedureIds: newProcedurePushes.map(({ procedureId }) => procedureId) });
  }
  PushNotifiaction.update(
    {
      status: 'new',
    },
    { status: 'complete' },
    { multi: true },
  );
};
