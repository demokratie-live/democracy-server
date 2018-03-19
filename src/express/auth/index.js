import mongoose from 'mongoose';
import passport from 'passport';

import jwt from './jsonWebToken';

export default (app) => {
  const User = mongoose.model('User');

  app.use(passport.initialize());
  //   app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    done(null, await User.findById(id));
  });

  jwt(app);
};
