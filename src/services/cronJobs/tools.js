import CronJobModel from './../../models/CronJob';

export const getCron = async ({ name }) => {
  const cronjob = await CronJobModel.findOne({ name });
  if (!cronjob) {
    return {
      name,
      lastErrorDate: null,
      lastSuccessDate: null,
      lastSuccessStartDate: null,
    };
  }
  return cronjob;
};

export const setCronSuccess = async ({ name, successStartDate }) =>
  CronJobModel.findOneAndUpdate(
    { name },
    { lastSuccessDate: new Date(), lastSuccessStartDate: successStartDate },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

export const setCronError = async ({ name }) =>
  CronJobModel.findOneAndUpdate(
    { name },
    { lastErrorDate: new Date() },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

export const resetCronSuccessStartDate = async () =>
  CronJobModel.updateMany({}, { lastSuccessStartDate: new Date(0) });
