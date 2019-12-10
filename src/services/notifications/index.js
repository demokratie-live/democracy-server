/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import DeviceModel from '../../models/Device';
import ProcedureModel from '../../models/Procedure';
import {push as pushIOS} from './iOS';
import {pushBulk as pushAndroid} from './Android';
import PushNotifiaction from '../../models/PushNotifiaction';

export const PUSH_TYPE = {
  PROCEDURE: 'procedure',
  PROCEDURE_BULK: 'procedureBulk',
}

export const PUSH_CATEGORY = {
  CONFERENCE_WEEK: 'conferenceWeek',
  CONFERENCE_WEEK_VOTE: 'conferenceWeekVote',
  TOP100: 'top100',
  OUTCOME: 'outcome',
}

export const sendPushs = ({ tokenObjects, title = 'DEMOCRACY', message, payload }) => {
  // Remove duplicate Tokens
  const devices = tokenObjects.reduce((prev, { token, os }) => {
    const next = [...prev];
    if (!next.some(({ token: existingToken }) => existingToken === token)) {
      next.push({ token, os });
    }
    return next;
  }, []);

  // Send for iOS and collect tokens for Android to BulkPush
  const androidTokens = [];
  devices.forEach(({ token, os }) => {
    switch (os) {
      case 'ios':
        pushIOS({ title, message, payload, token });
        break;

      case 'android':
        androidTokens.push(token);
        break;

      default:
        break;
    }
  });
  pushAndroid({ title, message, payload, tokens: androidTokens });
};

export const sendQuedPushs = () => {
  // Query Database
  // send all pushs in there
}

export const quePushs = ({type, category, action, title, message, procedureIds, tokens, time = new Date()}) => {

}

// This is called every Sunday by a Cronjob
export const quePushsConferenceWeek = async () => {
  /*
  Kommende Woche ist Sitzungswoche!
  Es warten 13 spannende Themen auf Dich. Viel Spaß beim Abstimmen.
  (Sonntag vor Sitzungswoche, alle)
  */

  // Find coresponding Procedures
  const startOfWeek = moment().startOf('week').toDate(); // Should be So
  const endOfWeek   = moment().endOf('week').toDate(); // Should be Sa
  const procedures = await ProcedureModel.find({$and: [{voteDate: {$gte: startOfWeek}},{voteDate: {$lte: endOfWeek}}]},{ procedureId: 1 })
  const procedureIds = procedures.map(p => p.procedureId);

  // Find Devices & Tokens
  const devices = await DeviceModel.find({'notificationSettings.enabled': true});
  const tokens = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);

  // Only send Message if at least one vote & one token is found
  if(tokens.length > 0 && procedureIds.length > 0){
    const title = 'Kommende Woche ist Sitzungswoche!'
    const message = procedureIds.length === 1 ? `Es wartet 1 spannendes Thema auf Dich. Viel Spaß beim Abstimmen.` : `Es warten ${procedureIds.length} spannende Themen auf Dich. Viel Spaß beim Abstimmen.`
    quePushs({
      type: PUSH_TYPE.PROCEDURE_BULK,
      category: PUSH_CATEGORY.CONFERENCE_WEEK,
      title,
      message,
      procedureIds,
      tokens
    });
  }
}

export const quePushsVoteTop100 = async () => {
  /*
  TOP 100 - #1: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Top 100, Außerhalb der Sitzungwoche, 1x pro Tag, individuell)
  */

  // Check if we have a ConferenceWeek
  const startOfWeek = moment().startOf('isoweek').toDate(); // Should be Mo
  const endOfWeek   = moment().endOf('isoweek').toDate(); // Should be So
  const conferenceProceduresCount = await ProcedureModel.count({$and: [{voteDate: {$gte: startOfWeek}},{voteDate: {$lte: endOfWeek}}]},{ procedureId: 1 })
  // Dont Push TOP100 if we have an 
  if(conferenceProceduresCount > 0){
    return;
  }

  // find TOP100 procedures
  const top100Procedures = await ProcedureModel.find({period: 19})
    .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
    .limit(100);

  // Find Devices
  const devices = await DeviceModel.find({'notificationSettings.enabled': true});

  // loop through the TOP100
  let topId = 1;
  top100Procedures.forEach((procedure)=>{
    // loop through the devices and remove those we send a Push
    devices = devices.reduce(async (acc, device) => {
      let voted = null;
      // Check if device is associcated with a vote on the procedure
      if(CONFIG.SMS_VERIFICATION){
        const user = await UserModel.findOne({device: device._id, verified: true})
        if(user){
          voted = await VoteModel.findOne({
            procedure: procedure._id,
            type: 'Phone',
            voters: {
              $elemMatch: {
                voter: user.phone,
              },
            },
          })
          if(!voted){

          }
        } 
      } else {
        voted = await VoteModel.findOne({
          procedure: procedure._id,
          type: 'Device',
          voters: {
            $elemMatch: {
              voter: device._id,
            },
          },
        })
      }
      // Dont send Pushs - User has voted already
      if(voted){
        return [...acc,device]
      }
      // Check if we sent the user a notifiation in the past time on that procedure
      const tokens = device.pushTokens.reduce((acc, token) => {
        let result = acc;
        const pastPushs = PushNotifiactionModel.count({category: PUSH_CATEGORY.TOP100, procedureIds: procedure.procedureId, token, time: {$gte: moment().subtract('months', 1)}});
        if(pstPushs === 0){
          return [...acc,token]
        }
        return acc;
      },[]);
      // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
      if(tokens.length === 0){
        return [...acc,device]
      }
      // Send Pushs
      quePushs({
        type: PUSH_TYPE.PROCEDURE,
        category: PUSH_CATEGORY.TOP100,
        title: `TOP 100 - #${topId}: Jetzt Abstimmen!`,
        message: procedure.title,
        procedureIds,
        tokens,
        time
      });
      // We have qued a Push, remove device from list.
      return acc;
    },[])
    // Count the Top Number up
    topId += 1;
  })
}

export const quePushsOutcome = async (procedureId) => {
  /*
  Offizielles Ergebnis zu Deiner Abstimmung
  Lorem Ipsum Titel
  (Glocke, nicht limitiert, abgestimmt, alle)
  */

  /*
  Offizielles Ergebnis zur Abstimmung
  Lorem Ipsum Titel
  (Glocke, nicht limitiert, nicht abgestimmt, alle)
  */
  const title = voted ? 'Offizielles Ergebnis zu Deiner Abstimmung' : 'Offizielles Ergebnis zur Abstimmung'
  const message = procedure.title // TODO
  quePushs({
    type: PUSH_TYPE.PROCEDURE,
    category: PUSH_CATEGORY.OUTCOME,
    title,
    message,
    procedureIds: [procedureId],
    tokens,
  });
}

export const quePushsVoteConferenceWeek = () => {
  /*
  Diese Woche im Bundestag: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Innerhalb der Sitzungswoche, nicht abgestimmt, nicht vergangen, 1x pro Tag, individuell)
  */
  const title = 'Diese Woche im Bundestag: Jetzt Abstimmen!'
  const message = procedure.title // TODO
  quePushs({
    type: PUSH_TYPE.PROCEDURE,
    category: PUSH_CATEGORY.CONFERENCE_WEEK_VOTE,
    title,
    message,
    procedureIds,
    tokens,
  });
}


const newVote = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newVote': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Jetzt Abstimmen!';
  sendPushs({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: PUSH_ACTION.PROCEDURE_DETAILS,
      type: PUSH_TYPE.PROCEDURE,
      title,
      message: procedure.title,
    },
  });
};

const newVotes = async ({ procedureIds }) => {
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newVote': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Jetzt Abstimmen!';
  let message = `Es gibt ${procedureIds.length} neue Abstimmungen.`;
  let type = 'procedureBulk';
  if (procedureIds.length === 1) {
    const procedure = await ProcedureModel.findOne({
      procedureId: procedureIds[0],
    });
    message = `${procedure.title}`;
    type = PUSH_TYPE.PROCEDURE;
  }
  sendPushs({
    tokenObjects,
    title,
    message,
    payload: {
      procedureId: procedureIds[0],
      procedureIds,
      title,
      message,
      action: type,
      type,
    },
  });
};
// newVote({ procedureId: 231079 });

const newPreperation = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  let title;
  switch (procedure.type) {
    case 'Gesetzgebung':
      title = 'Neue Gesetzesinitiative!';
      break;
    case 'Antrag':
      title = 'Neuer Antrag!';
      break;
    default:
      title = 'Neu!';
      break;
  }
  sendPushs({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: PUSH_ACTION.PROCEDURE_DETAILS,
      type: PUSH_TYPE.PROCEDURE,
      title,
      message: procedure.title,
    },
  });
};

const newPreperations = async ({ procedureIds }) => {
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Neu in Vorbereitung!';
  let message = `${procedureIds.length} Elemente neu in Vorbereitung`;
  let type = PUSH_ACTION.PROCEDURE_BULK;

  if (procedureIds.length === 1) {
    const procedure = await ProcedureModel.findOne({
      procedureId: procedureIds[0],
    });
    message = `${procedure.title}`;
    type = PUSH_TYPE.PROCEDURE;
  }
  sendPushs({
    tokenObjects,
    title,
    message,
    payload: {
      procedureIds,
      procedureId: procedureIds[0],
      title,
      message,
      action: type,
      type,
    },
  });
};
// newPreperation({ procedureId: 231079 });

const procedureUpdate = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.procedures': procedure._id,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Update!';
  sendPushs({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: PUSH_ACTION.PROCEDURE_DETAILS,
      type: PUSH_TYPE.PROCEDURE,
      title,
      message: procedure.title,
    },
  });
};
// procedureUpdate({ procedureId: 231079 });

export { procedureUpdate, newVote, newVotes, newPreperation, newPreperations };
