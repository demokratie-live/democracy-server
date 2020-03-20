import { getCurrentConferenceWeek } from '../../data/conference-weeks';

export default {
  Query: {
    currentConferenceWeek: async () => {
      global.Log.graphql('ConferenceWeek.query.currentConferenceWeek');
      return getCurrentConferenceWeek();
    },
  },
};
