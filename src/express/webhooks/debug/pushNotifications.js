import UserModel from '../../../models/User';
import pushNotify from '../../../services/notifications';

export default async (req, res) => {
  const { message, title } = req.query;
  if (!message) {
    res.send('message is missing');
  }
  const users = await UserModel.find();
  users.forEach((user) => {
    pushNotify({
      title: title || 'DEMOCRACY',
      message,
      user,
      payload: {
        action: 'procedureDetails',
        title: 'Neues Gesetz!',
        message: message || 'Test push notification to all users',
        procedureId: 232647,
        type: 'procedure',
      },
    });
  });
  res.send("push's send");
};
