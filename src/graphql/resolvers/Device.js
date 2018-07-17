/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
/* eslint no-param-reassign: 0 */

import _ from 'lodash';
import crypto from 'crypto';
import { isLoggedin } from '../../express/auth/permissions';
import { createTokens, headerToken } from '../../express/auth';

export default {
  Query: {
    notificationSettings: isLoggedin.createResolver(async (parent, args, { device }) =>
      device.notificationSettings),
  },

  Mutation: {
    requestCode: isLoggedin.createResolver(async (parent, { newPhone, oldPhoneHash },
      { phone, device }) => {
      // Check for invalid transfere
      const newPhoneHash = crypto.createHash('sha256').update(newPhone).digest('hex');
      if (newPhoneHash === oldPhoneHash) {
        return {
          reason: 'newPhoneHash === oldPhoneHash',
          succeeded: false,
        };
      }

      // Check for valid oldPhoneHash
      if ((oldPhoneHash && !phone) || (phone && phone.phoneHash !== oldPhoneHash)) {
        return {
          reason: 'oldPhoneHash !== user.phoneHash',
          succeeded: false,
        };
      }

      const now = new Date();
      // Check if there is still a valid Code
      const activeCode = device.verifications.find(({ expires }) => now < expires);
      if (activeCode) {
        return {
          reason: 'Valid Code still present',
          succeeded: false,
        };
      }

      // Genrate Code
      const min = 10000;
      const max = 99999;
      const code = Math.floor(Math.random() * (max - min + 1)) + min; // eslint-disable-line

      // Send SMS
      // We should send the SMS here and return false if we dont succeed

      // Expiretime: 10 Minutes
      const expires = new Date(now.getTime() + 600000);
      device.verifications.push({
        newPhoneHash,
        oldPhoneHash,
        code,
        expires,
      });
      device.save();

      return {
        succeeded: true,
      };
    }),

    requestVerification: isLoggedin.createResolver(async (parent, { code }, {
      res, user, device, phone, UserModel, PhoneModel,
    }) => {
      // Find Code
      const now = new Date();
      const verification = device.verifications.find(({ code: dbCode, expires }) =>
        now < expires && code === dbCode);

      // Code valid?
      if (!verification) {
        return {
          reason: 'Invalid Code or Code expired.',
          succeeded: false,
        };
      }

      // Invalidate Code
      device.verifications = device.verifications.map((obj) => {
        if (obj._id === verification._id) {
          obj.expires = now;
        }
        return obj;
      });
      device.save();

      // User has phoneHash, but no oldPhoneHash?
      if ((phone && phone.phoneHash && !verification.oldPhoneHash) ||
        (verification.oldPhoneHash && phone.phoneHash !== verification.oldPhoneHash)) {
        return {
          reason: 'User phoneHash and oldPhoneHash inconsistent',
          succeeded: false,
        };
      }

      // Find or create Phone
      let newPhone = await PhoneModel.findOne({ phoneHash: verification.newPhoneHash });
      if (!newPhone) {
        if (verification.oldPhoneHash) {
          newPhone = await PhoneModel.findOne({ phoneHash: verification.oldPhoneHash });
          newPhone.phoneHash = verification.newPhoneHash;
          await newPhone.save();
        } else {
          // Create Phone
          newPhone = new PhoneModel({ phoneHash: verification.newPhoneHash });
          await newPhone.save();
        }
      }

      // Delete Existing User
      await UserModel.deleteOne({ device: device._id, phone: newPhone._id });

      // Unverify all of the same device or phone
      await UserModel.update(
        { $or: [{ device: device._id }, { phone: newPhone._id }] },
        { verified: false },
        { multi: true },
      );

      // Create new User and update session User
      user = await UserModel.create({ device: device._id, phone: newPhone._id, verified: true });
      // This should not be necessary since the call ends here - but you never know
      phone = newPhone;

      // Send new tokens since user id has been changed
      const [token, refreshToken] = await createTokens(user._id);
      headerToken({ res, token, refreshToken });

      return {
        succeeded: true,
      };
    }),

    addToken: isLoggedin.createResolver(async (parent, { token, os }, { device }) => {
      if (!device.pushTokens.some(t => t.token === token)) {
        device.pushTokens.push({ token, os });
        device.save();
      }
      return {
        succeeded: true,
      };
    }),

    updateNotificationSettings: isLoggedin.createResolver(async (
      parent,
      {
        enabled, disableUntil, procedures, tags, newVote, newPreperation,
      },
      { device },
    ) => {
      device.notificationSettings = {
        ...device.notificationSettings,
        ..._.omitBy(
          {
            enabled,
            disableUntil,
            procedures,
            tags,
            newVote,
            newPreperation,
          },
          _.isNil,
        ),
      };
      await device.save();
      return device.notificationSettings;
    }),

    toggleNotification: isLoggedin.createResolver(async (parent,
      { procedureId }, { device, ProcedureModel }) => {
      const procedure = await ProcedureModel.findOne({ procedureId });

      const index = device.notificationSettings.procedures.indexOf(procedure._id);
      let notify;
      if (index > -1) {
        notify = false;
        device.notificationSettings.procedures.splice(index, 1);
      } else {
        notify = true;
        device.notificationSettings.procedures.push(procedure._id);
      }
      await device.save();
      return { ...procedure.toObject(), notify };
    }),
  },
};
