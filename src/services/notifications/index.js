/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import moment from 'moment';
import {filter, reduce} from 'p-iteration'

import CONFIG from '../../config'

import DeviceModel from '../../models/Device';
import UserModel from '../../models/User';
import ProcedureModel from '../../models/Procedure';
import VoteModel from '../../models/Vote';
import {default as PushNotificationModel, PUSH_TYPE, PUSH_CATEGORY, PUSH_OS} from '../../models/PushNotification';

import {push as pushIOS} from './iOS';
import {push as pushAndroid} from './Android';

export const sendQuedPushs = async () => {
  // Query Database
  const pushs = await PushNotificationModel.find({sent: false, time: {$lte: new Date()}})
  // send all pushs in there
  const sent = await pushs.map(({_id, type, category, title, message, procedureIds, token, os}) => {
    // Construct Payload
    const payload = {
      type,
      action: type,
      category,
      title,
      message,
      procedureId: procedureIds[0],
      procedureIds,
    };
    // Send Pushs
    switch(os){
      case PUSH_OS.ANDROID:
        pushAndroid({ title, message, payload, token, callback: async (err, response) => {
            if (err || response.success !== 1 || response.failure !== 0) {
              // Write failure to Database
              await PushNotificationModel.update(
                { _id },
                { $set: { failure: JSON.stringify({ err, response }) } }
              )
              // Remove broken Push tokens
              if(response.results && response.results[0].error === 'NotRegistered'){
                await DeviceModel.update(
                  { },
                  { $pull: { pushTokens: { token } } },
                  { multi: true }
                )
                Log.error(`[PUSH] Android failure - removig token`);
              } else {
                Log.error(`[PUSH] Android failure ${JSON.stringify({ token, err, response })}`);
              }
            }
          }
        });
        break;
      case PUSH_OS.IOS:
        pushIOS({ title, message, payload, token });
        break;
    }
    // Return id
    return _id;
  });
  // Set sent = true
  await PushNotificationModel.update(
    { _id: {$in: sent} },
    { $set: { sent: true } },
    { multi: true }
  )
  
  Log.info(`[PUSH] Sent ${sent.length} Pushs`)

  return true;
}

export const quePushs = async ({type, category, title, message, procedureIds, tokens, time = new Date()}) => {
  console.log(type, category, title, message, procedureIds, tokens.length, time)
  // Generate one push for each token
  const docs = tokens.map(({token, os})=>{
    return {
      type,
      category,
      title,
      message,
      procedureIds,
      token,
      os,
      time
    }
  });

  await PushNotificationModel.insertMany(docs)

  return true;
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
  const conferenceProceduresCount = await ProcedureModel.count({$and: [{voteDate: {$gte: startOfWeek}},{voteDate: {$lte: endOfWeek}}]})
  
  // Dont Push TOP100 if we have an active conferenceWeek
  if(conferenceProceduresCount > 0){
    return;
  }

  // find TOP100 procedures
  const top100Procedures = await ProcedureModel.find({period: 19})
    .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
    .limit(100);

  // Find Devices
  let devices = await DeviceModel.find({'notificationSettings.enabled': true, pushTokens: { $gt: [] } });

  // loop through the TOP100
  let topId = 1;
  for (var i = 0; i < top100Procedures.length; i++) {
    // Iterate over numeric indexes from 0 to 5, as everyone expects.
    const procedure = top100Procedures[i]
    // Skip some calls
    if(devices.length === 0){
      continue
    }
    // loop through the devices and remove those we send a Push
    devices = await filter(devices,async (device) => {
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
        return true;
      }
      // Check if we sent the user a notifiation in the past time on that procedure
      const tokens = await reduce(device.pushTokens, async (acc, token) => {
        const pastPushs = await PushNotificationModel.count({category: PUSH_CATEGORY.TOP100, procedureIds: procedure.procedureId, token: token.token, os: token.os, time: {$gte: moment().subtract(1, 'months')}});
        if(pastPushs === 0){
          return [...acc,token]
        }
        return acc;
      },[]);
      // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
      if(tokens.length === 0){
        return true;
      }
      // Calculate random Time:
      const time = new Date();
      time.setHours(9+Math.round(Math.random()*9))
      // Send Pushs
      quePushs({
        type: PUSH_TYPE.PROCEDURE,
        category: PUSH_CATEGORY.TOP100,
        title: `TOP 100 - #${topId}: Jetzt Abstimmen!`,
        message: procedure.title,
        procedureIds: [procedure.procedureId],
        tokens,
        time,
      });
      // We have qued a Push, remove device from list.
      return false;
    },[])
    // Count the Top Number up
    topId += 1;
  }
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
