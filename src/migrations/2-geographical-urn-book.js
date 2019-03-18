/* eslint no-await-in-loop: 0 */
import mongoose from 'mongoose';

import VoteSchema from './2-schemas/Vote';

module.exports.id = 'geographical-urn-book';

module.exports.up = async function(done) { // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Do we have a fresh install? - Mark as done
    const collections = await new Promise((resolve, reject) => {
      this.db.listCollections().toArray((err, names) => {
        if (err) {
          reject(err);
        } else {
          resolve(names);
        }
      });
    }).then(c => c.map(({ name }) => name));

    const neededCollections = ['votes'];
    const crashingCollections = ['old_votes-geographical-urn-book'];

    // if no target collection exists. Migration isn't neccecary
    if (!neededCollections.some(c => collections.includes(c))) {
      return done();
    }

    // Check if crashing collections does not exists
    if (crashingCollections.some(c => collections.includes(c))) {
      return done(Error('some Collections with target name for renaming exists'));
    }

    // Check if needed collections does exists
    if (!neededCollections.every(c => collections.includes(c))) {
      return done(Error('some source Collections missing'));
    }

    // rename collection
    await this.db.collection('votes').rename('old_votes-geographical-urn-book');
    Log.info('Migration: Renamed votes -> old_votes-geographical-urn-book');

    // find collections
    const oldVotes = this.db.collection('old_votes-geographical-urn-book');

    // Remove Model from Mongoose if needed
    if (mongoose.connection.models.Vote) {
      delete mongoose.connection.models.Vote;
    }

    // Load Models
    const VoteModel = mongoose.model('Vote', VoteSchema);

    // Transform oldVotes -> Votes
    Log.info('Migration: Transform collection old_votes-geographical-urn-book -> votes');
    const voteCursor = oldVotes.find();
    while (await voteCursor.hasNext()) {
      const oldVote = await voteCursor.next();
      // New Vote Type Phone
      if (
        oldVote.voteResults.phone.yes +
          oldVote.voteResults.phone.no +
          oldVote.voteResults.phone.abstination >
        0
      ) {
        // Get all Phone Voters
        const newPhoneVoters = oldVote.voters.reduce((arr, { kind, voter }) => {
          if (kind === 'Phone') {
            return [...arr, { voter }];
          }
          return arr;
        }, []);
        // Create new Vote Object type Phone
        const newPhoneVote = await VoteModel.create({
          procedure: oldVote.procedure,
          state: oldVote.state,
          type: 'Phone',
          voters: newPhoneVoters,
          votes: {
            general: {
              yes: oldVote.voteResults.phone.yes,
              no: oldVote.voteResults.phone.no,
              abstain: oldVote.voteResults.phone.abstination,
            },
            cache: {
              yes: oldVote.voteResults.phone.yes,
              no: oldVote.voteResults.phone.no,
              abstain: oldVote.voteResults.phone.abstination,
            },
          },
        });
        await newPhoneVote.save();
      }

      // New Vote Type Device
      if (
        oldVote.voteResults.device.yes +
          oldVote.voteResults.device.no +
          oldVote.voteResults.device.abstination >
        0
      ) {
        // Get all Device Voters
        const newDeviceVoters = oldVote.voters.reduce((arr, { kind, voter }) => {
          if (kind === 'Device') {
            return [...arr, { voter }];
          }
          return arr;
        }, []);
        // Create new Vote Object type Device
        const newDeviceVote = await VoteModel.create({
          procedure: oldVote.procedure,
          state: oldVote.state,
          type: 'Device',
          voters: newDeviceVoters,
          votes: {
            general: {
              yes: oldVote.voteResults.device.yes,
              no: oldVote.voteResults.device.no,
              abstain: oldVote.voteResults.device.abstination,
            },
            cache: {
              yes: oldVote.voteResults.device.yes,
              no: oldVote.voteResults.device.no,
              abstain: oldVote.voteResults.device.abstination,
            },
          },
        });
        await newDeviceVote.save();
      }
    }

    Log.info('Migration: Done transforming collection old_votes-geographical-urn-book -> votes');
    done();
  } catch (err) {
    done(err);
  }
};

module.exports.down = function(done) { // eslint-disable-line
  // We could revert this - but why make the effort?
  done(new Error('Not supported rollback!'));
};
