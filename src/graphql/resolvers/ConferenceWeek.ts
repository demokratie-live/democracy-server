import { getCurrentConferenceWeek } from '../../data/conference-weeks';
import { Resolvers } from '../../generated/graphql';

const ConferenceWeekApi: Resolvers = {
  Query: {
    currentConferenceWeek: async () => {
      global.Log.graphql('ConferenceWeek.query.currentConferenceWeek');
      return getCurrentConferenceWeek();
    },
  },
};

export default ConferenceWeekApi;
