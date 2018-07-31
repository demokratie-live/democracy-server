/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
/* eslint no-param-reassign: 0 */

import _ from 'lodash';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import CONSTANTS from '../../config/constants';
import { isLoggedin } from '../../express/auth/permissions';
import { createTokens, headerToken } from '../../express/auth';

export default {
  Query: {
    notificationSettings: isLoggedin.createResolver(async (parent, args, { device }) =>
      device.notificationSettings),
  },

  Mutation: {
    requestCode: isLoggedin.createResolver(async (parent, { newPhone, oldPhoneHash }, {
      user,
      device,
      phone,
      PhoneModel,
      VerificationModel,
    }) => {
      // Check for invalid transfere
      const newPhoneHash = crypto.createHash('sha256').update(newPhone).digest('hex');
      if (newPhoneHash === oldPhoneHash) {
        return {
          reason: 'newPhoneHash equals oldPhoneHash',
          succeeded: false,
        };
      }

      // Check for valid oldPhoneHash
      if ((oldPhoneHash && !user.isVerified()) ||
        (oldPhoneHash && !phone) ||
        (phone && phone.phoneHash !== bcrypt.hashSync(oldPhoneHash, CONSTANTS.BCRYPT_SALT))) {
        return {
          reason: 'Provided oldPhoneHash is invalid',
          succeeded: false,
        };
      }

      let verification = await VerificationModel.findOne({
        phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
      });
      if (!verification) {
        verification = new VerificationModel({
          phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
        });
        await verification.save();
      }

      const now = new Date();
      // Check if there is still a valid Code
      const activeCode = verification.verifications.find(({ expires }) => now < expires);
      if (activeCode) {
        return {
          reason: 'Valid Code still present',
          succeeded: false,
        };
      }

      // Genrate Code
      const min = 100000;
      const max = 999999;
      const code = Math.floor(Math.random() * (max - min + 1)) + min; // eslint-disable-line

      // Send SMS
      // We should send the SMS here and return false if we dont succeed

      // Allow to create new user based on last usage
      const verificationPhone = await PhoneModel.findOne({
        phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
      });
      let allowNewUser = false; // Is only set if there was a user registered
      if (verificationPhone && verificationPhone.updatedAt < (
        new Date(now.getTime() - CONSTANTS.SMS_VERIFICATION_NEW_USER_DELAY))) {
        // Older then 6 Months
        allowNewUser = true;
      }

      // Expiretime: 10 Minutes
      const expires = new Date(now.getTime() + CONSTANTS.SMS_VERIFICATION_CODE_TTL);
      verification.verifications.push({
        deviceHash: device.deviceHash,
        oldPhoneHash: bcrypt.hashSync(oldPhoneHash, CONSTANTS.BCRYPT_SALT),
        code,
        expires,
      });
      await verification.save();

      return {
        allowNewUser,
        succeeded: true,
      };
    }),

    requestVerification: isLoggedin.createResolver(async (parent, { code, newPhoneHash, newUser }, {
      res, user, device, phone, UserModel, PhoneModel, VerificationModel,
    }) => {
      // Find Verification
      const verifications = await VerificationModel.findOne({
        phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
      });
      if (!verifications) {
        return {
          reason: 'Could not find verification request',
          succeeded: false,
        };
      }

      // Find Code
      const now = new Date();
      const verification = verifications.verifications.find(({ code: dbCode, expires }) =>
        now < expires && code === dbCode);

      // Code valid?
      if (!verification) {
        return {
          reason: 'Invalid Code or Code expired',
          succeeded: false,
        };
      }

      // Check device
      if (device.deviceHash !== verification.deviceHash) {
        return {
          reason: 'Code requested from another Device',
          succeeded: false,
        };
      }

      // User has phoneHash, but no oldPhoneHash?
      if ((phone && phone.phoneHash && !verification.oldPhoneHash) ||
        (verification.oldPhoneHash && (!phone || phone.phoneHash !== verification.oldPhoneHash))) {
        return {
          reason: 'User phoneHash and oldPhoneHash inconsistent',
          succeeded: false,
        };
      }

      // Invalidate Code
      verifications.verifications = verifications.verifications.map((obj) => {
        if (obj._id === verification._id) {
          obj.expires = now;
        }
        return obj;
      });
      await verifications.save();

      // New Phone
      let newPhone = await PhoneModel.findOne({
        phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
      });
      // Phone exists & New User?
      if (newPhone && newUser && newPhone.updatedAt < (
        new Date(now.getTime() - CONSTANTS.SMS_VERIFICATION_NEW_USER_DELAY))) {
        // Allow new User - Invalidate newPhone
        newPhone.phoneHash = `Invalidated at '${now}': ${newPhone.phoneHash}`;
        await newPhone.save();
        newPhone = null;
      }

      // oldPhoneHash and no newPhone
      if (verification.oldPhoneHash && !newPhone) {
        // Find old Phone
        const oldPhone = await PhoneModel.findOne({ phoneHash: verification.oldPhoneHash });
        // We found an old phone and no new User is requested
        if (oldPhone && (!newUser || oldPhone.updatedAt >= (
          new Date(now.getTime() - CONSTANTS.SMS_VERIFICATION_NEW_USER_DELAY)))) {
          newPhone = oldPhone;
          newPhone.phoneHash = newPhoneHash;
          await newPhone.save();
        }
      }

      // Still no newPhone?
      if (!newPhone) {
        // Create Phone
        newPhone = new PhoneModel({
          phoneHash: bcrypt.hashSync(newPhoneHash, CONSTANTS.BCRYPT_SALT),
        });
        await newPhone.save();
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
      user = await UserModel.create({
        device: device._id,
        phone: newPhone._id,
        verified: true,
      });
      await user.save();
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
        await device.save();
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
