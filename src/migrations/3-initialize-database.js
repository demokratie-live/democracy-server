import mongoose from 'mongoose';
// import utils from 'mongoose/lib/utils';

import ActivitySchema from './1-schemas/Activity';
import DeputySchema from './3-schemas/Deputy';
import DeviceSchema from './1-schemas/Device';
import PhoneSchema from './3-schemas/Phone';
import ProcedureSchema from './3-schemas/Procedure';
import SearchTermSchema from './3-schemas/SearchTerm';
import UserSchema from './1-schemas/User';
import VerificationSchema from './3-schemas/Verification';
import VoteSchema from './2-schemas/Vote';

module.exports.id = 'initialize-database';

// Better late the never - initialize database
module.exports.up = async function(done) { // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Since we have no Modelchanges here, we do not need to remove Models from mongoose

    // PushNotifications have no index therefore we need to create the collection manually
    // Pluralize not working correctly: utils.toCollectionName('PushNotification') -> PushNotification
    await this.db.createCollection('pushnotifications');

    // The following models do have indexes and the coresponding collection will be created
    const Activities = mongoose.model('Activity', ActivitySchema);
    await Activities.ensureIndexes();
    const Deputies = mongoose.model('Deputy', DeputySchema);
    await Deputies.ensureIndexes();
    const Devices = mongoose.model('Device', DeviceSchema);
    await Devices.ensureIndexes();
    const Phones = mongoose.model('Phone', PhoneSchema);
    await Phones.ensureIndexes();
    const Procedures = mongoose.model('Procedure', ProcedureSchema);
    await Procedures.ensureIndexes();
    const SearchTerms = mongoose.model('SearchTerm', SearchTermSchema);
    await SearchTerms.ensureIndexes();
    const Users = mongoose.model('User', UserSchema);
    await Users.ensureIndexes();
    const Verifications = mongoose.model('Verification', VerificationSchema);
    await Verifications.ensureIndexes();
    const Votes = mongoose.model('Vote', VoteSchema);
    await Votes.ensureIndexes();
    done();
  } catch (err) {
    done(err);
  }
};

module.exports.down = function(done) { // eslint-disable-line
  // We should not revert this - this could cause dataloss
  done(new Error('Not supported rollback!'));
};
