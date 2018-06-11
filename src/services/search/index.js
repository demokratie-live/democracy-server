import elasticsearch from 'elasticsearch';

import constants from '../../config/constants';

const client = new elasticsearch.Client({
  host: `${constants.ELASTICSEARCH_URL}:9200`,
  log: process.NODE_ENV === 'development' ? 'warning' : 'error',
});

export default client;
