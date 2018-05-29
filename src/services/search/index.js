import elasticsearch from 'elasticsearch';

import constants from '../../config/constants';

const client = new elasticsearch.Client({
  host: `${constants.ELASTICSEARCH_URL}:9200`,
  log: 'trace',
});

export default client;
