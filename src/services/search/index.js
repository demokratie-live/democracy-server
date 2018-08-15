import elasticsearch from 'elasticsearch';

import CONSTANTS from '../../config/constants';

const client = new elasticsearch.Client({
  host: `${CONSTANTS.ELASTICSEARCH_URL}:9200`,
  log: process.NODE_ENV === 'development' ? 'warning' : 'error',
});

export default client;
