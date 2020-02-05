/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';
import CONFIG from '../../config';
import { getCurrentConferenceWeek } from '../../data/conference-weeks';

export default {
  Query: {
    currentConferenceWeek: async (parent, _, { ProcedureModel, ActivityModel, user }) => {
      Log.graphql('ConferenceWeek.query.currentConferenceWeek');
      return getCurrentConferenceWeek();
    },
  },
};
