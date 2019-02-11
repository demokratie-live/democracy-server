/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
/* eslint no-param-reassign: 0 */

import ms from 'ms';
import _ from 'lodash';
import crypto from 'crypto';

import CONFIG from '../../config';
import { isLoggedin } from '../../express/auth/permissions';
import { createTokens, headerToken } from '../../express/auth';
import { sendSMS, statusSMS } from '../../services/sms';

const calculateResendTime = ({ latestCodeTime, codesCount, expires }) =>
  new Date(
    Math.min(
      expires,
      latestCodeTime +
        (ms(CONFIG.SMS_VERIFICATION_CODE_RESEND_BASETIME) / 1000) ** codesCount * 1000,
    ),
  );

export default {
  Query: {
    notificationSettings: isLoggedin.createResolver(async (parent, args, { device }) => {
      Log.graphql('Device.query.notificationSettings');
      return device.notificationSettings;
    }),
  },

  Mutation: {
    // ************
    // REQUEST CODE
    // ************
    requestCode: isLoggedin.createResolver(
      async (
        parent,
        { newPhone, oldPhoneHash },
        { user, device, phone, PhoneModel, VerificationModel },
      ) => {
        Log.graphql('Device.mutation.requestCode');
        // Check for SMS Verification
        if (!CONFIG.SMS_VERIFICATION) {
          return {
            reason: 'SMS Verification is disabled!',
            succeeded: false,
          };
        }

        if (!oldPhoneHash && user.isVerified()) {
          return {
            reason: 'You are already verified!',
            succeeded: false,
          };
        }

        // check newPhone prefix & length, 3 prefix, min. length 10
        if (newPhone.substr(0, 3) !== '+49' || newPhone.length < 13) {
          return {
            reason:
              'newPhone is invalid - does not have the required length of min. 14 digits or does not start with countrycode 0049',
            succeeded: false,
          };
        }

        // Check for invalid transfere
        const newPhoneHash = crypto
          .createHash('sha256')
          .update(newPhone)
          .digest('hex');
        const newPhoneDBHash = crypto
          .createHash('sha256')
          .update(newPhoneHash)
          .digest('hex');
        const oldPhoneDBHash = oldPhoneHash
          ? crypto
              .createHash('sha256')
              .update(oldPhoneHash)
              .digest('hex')
          : null;
        if (newPhoneHash === oldPhoneHash) {
          return {
            reason: 'newPhoneHash equals oldPhoneHash',
            succeeded: false,
          };
        }

        // Check for valid oldPhoneHash
        if ((oldPhoneHash && !user.isVerified()) || (oldPhoneHash && !phone)) {
          return {
            reason: 'Provided oldPhoneHash is invalid',
            succeeded: false,
          };
        }

        let verification = await VerificationModel.findOne({
          phoneHash: newPhoneDBHash,
        });
        if (!verification) {
          verification = new VerificationModel({
            phoneHash: newPhoneDBHash,
          });
        }

        // Genrate Code
        const minVal = 100000;
        const maxVal = 999999;

        let code = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal; // eslint-disable-line
        if (CONFIG.SMS_SIMULATE) {
          code = '000000';
        }

        const now = new Date();
        // Check if there is still a valid Code
        const activeCode = verification.verifications.find(({ expires }) => now < expires);
        if (activeCode) {
          // ***********
          // Resend Code
          // ***********
          // Find Code Count & latest Code Time
          const codesCount = activeCode.codes.length;
          const latestCode = activeCode.codes.reduce(
            (max, p) => (p.time > max.time ? p : max),
            activeCode.codes[0],
          );

          // Check code time
          if (
            latestCode.time.getTime() +
              ms(CONFIG.SMS_VERIFICATION_CODE_RESEND_BASETIME) ** codesCount >=
            now.getTime()
          ) {
            return {
              reason: 'You have to wait till you can request another Code',
              resendTime: calculateResendTime({
                latestCodeTime: latestCode.time.getTime(),
                codesCount,
                expires: new Date(activeCode.expires).getTime(),
              }),
              expireTime: activeCode.expires,
              succeeded: false,
            };
          }

          // Validate that the Number has recieved the Code
          const smsstatus = await statusSMS(latestCode.SMSID);
          if (!smsstatus) {
            return {
              reason: 'Your number seems incorrect, please correct it!',
              succeeded: false,
            };
          }

          // Send SMS
          const { status, SMSID } = await sendSMS(newPhone, code);

          activeCode.codes.push({
            code,
            time: now,
            SMSID,
          });
          await verification.save();

          // Check Status here to make sure the Verification request is saved
          if (!status) {
            return {
              reason: 'Could not send SMS to given newPhone',
              succeeded: false,
            };
          }

          return {
            succeeded: true,
            resendTime: calculateResendTime({
              latestCodeTime: now.getTime(),
              codesCount: codesCount + 1,
              expires: new Date(activeCode.expires).getTime(),
            }),
            expireTime: activeCode.expires,
          };
          // ***********
          // Resend Code
          // ********END
        }

        // Send SMS
        const { status, SMSID } = await sendSMS(newPhone, code);

        // Allow to create new user based on last usage
        const verificationPhone = await PhoneModel.findOne({
          phoneHash: newPhoneDBHash,
        });
        let allowNewUser = false; // Is only set if there was a user registered
        if (
          verificationPhone &&
          verificationPhone.updatedAt <
            new Date(now.getTime() - ms(CONFIG.SMS_VERIFICATION_NEW_USER_DELAY))
        ) {
          // Older then 6 Months
          allowNewUser = true;
        }

        // Code expiretime
        const expires = new Date(now.getTime() + ms(CONFIG.SMS_VERIFICATION_CODE_TTL));
        verification.verifications.push({
          deviceHash: device.deviceHash,
          oldPhoneHash: oldPhoneDBHash,
          codes: [{ code, time: now, SMSID }],
          expires,
        });
        await verification.save();

        // Check Status here to make sure the Verification request is saved
        if (!status) {
          return {
            reason: 'Could not send SMS to given newPhone',
            succeeded: false,
          };
        }

        return {
          allowNewUser,
          resendTime: calculateResendTime({
            latestCodeTime: now.getTime(),
            codesCount: 1,
            expires: expires.getTime(),
          }),
          expireTime: expires,
          succeeded: true,
        };
      },
    ),

    // ********************
    // REQUEST VERIFICATION
    // ********************
    requestVerification: isLoggedin.createResolver(
      async (
        parent,
        { code, newPhoneHash, newUser },
        { res, user, device, phone, UserModel, PhoneModel, VerificationModel },
      ) => {
        Log.graphql('Device.mutation.requestVerification');
        // Check for SMS Verification
        if (!CONFIG.SMS_VERIFICATION) {
          return {
            reason: 'SMS Verification is disabled!',
            succeeded: false,
          };
        }

        const newPhoneDBHash = crypto
          .createHash('sha256')
          .update(newPhoneHash)
          .digest('hex');
        // Find Verification
        const verifications = await VerificationModel.findOne({
          phoneHash: newPhoneDBHash,
        });
        if (!verifications) {
          return {
            reason: 'Could not find verification request',
            succeeded: false,
          };
        }

        // Find Code
        const now = new Date();
        const verification = verifications.verifications.find(
          ({ expires, codes }) =>
            now < expires && codes.find(({ code: dbCode }) => code === dbCode),
        );

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
        if (
          verification.oldPhoneHash &&
          (!phone || phone.phoneHash !== verification.oldPhoneHash)
        ) {
          return {
            reason: 'User phoneHash and oldPhoneHash inconsistent',
            succeeded: false,
          };
        }

        // Invalidate Code
        verifications.verifications = verifications.verifications.map(obj => {
          if (obj._id === verification._id) {
            obj.expires = now;
          }
          return obj;
        });
        await verifications.save();

        // New Phone
        let newPhone = await PhoneModel.findOne({
          phoneHash: newPhoneDBHash,
        });
        // Phone exists & New User?
        if (
          newPhone &&
          newUser &&
          newPhone.updatedAt < new Date(now.getTime() - ms(CONFIG.SMS_VERIFICATION_NEW_USER_DELAY))
        ) {
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
          if (
            oldPhone &&
            (!newUser ||
              oldPhone.updatedAt >=
                new Date(now.getTime() - ms(CONFIG.SMS_VERIFICATION_NEW_USER_DELAY)))
          ) {
            newPhone = oldPhone;
            newPhone.phoneHash = newPhoneHash;
            await newPhone.save();
          }
        }

        // Still no newPhone?
        if (!newPhone) {
          // Create Phone
          newPhone = new PhoneModel({
            phoneHash: newPhoneDBHash,
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
      },
    ),

    addToken: isLoggedin.createResolver(async (parent, { token, os }, { device }) => {
      Log.graphql('Device.mutation.addToken');
      if (!device.pushTokens.some(t => t.token === token)) {
        device.pushTokens.push({ token, os });
        await device.save();
      }
      return {
        succeeded: true,
      };
    }),

    updateNotificationSettings: isLoggedin.createResolver(
      async (
        parent,
        { enabled, disableUntil, procedures, tags, newVote, newPreperation },
        { device },
      ) => {
        Log.graphql('Device.mutation.updateNotificationSettings');
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
      },
    ),

    toggleNotification: isLoggedin.createResolver(
      async (parent, { procedureId }, { device, ProcedureModel }) => {
        Log.graphql('Device.mutation.toggleNotification');
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
      },
    ),
  },
};
