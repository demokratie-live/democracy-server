import DeviceModel from '../../../models/Device';
import pushNotify from '../../../services/notifications';

export default async (req, res) => {
  const { message, title } = req.query;
  if (!message) {
    res.send('message is missing');
  }
  const devices = await DeviceModel.find();
  devices.forEach((device) => {
    pushNotify({
      title: title || 'DEMOCRACY',
      message,
      device,
      payload: {
        action: 'procedureDetails',
        title: 'Neues Gesetz!',
        message: message || 'Test push notification to all devices',
        procedureId: 232647,
        type: 'procedure',
      },
    });
  });
  res.send("push's send");
};
