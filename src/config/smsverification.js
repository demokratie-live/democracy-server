export default {
  SMS_VERIFICATION: !(process.env.SMS_VERIFICATION === 'false'),
  SMS_VERIFICATION_CODE_TTL: process.env.SMS_VERIFICATION_CODE_TTL || '1d',
  SMS_VERIFICATION_CODE_RESEND_BASETIME:
    process.env.SMS_VERIFICATION_CODE_RESEND_BASETIME || '120s',
  SMS_VERIFICATION_NEW_USER_DELAY: process.env.SMS_VERIFICATION_NEW_USER_DELAY || '24w',
  SMS_PROVIDER_KEY: process.env.SMS_PROVIDER_KEY,
  SMS_SIMULATE: process.env.SMS_SIMULATE === 'true',
};
