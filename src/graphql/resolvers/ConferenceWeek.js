import { getCurrentConferenceWeek } from '../../data/conference-weeks';

export default {
  Query: {
    currentConferenceWeek: async () => {
      Log.graphql('ConferenceWeek.query.currentConferenceWeek');
      return getCurrentConferenceWeek();
    },
  },
};
