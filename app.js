const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const requestIp = require('request-ip');
const { Log } = require("./collections/log");

/**
 * TODO: 
 * Change this to the real connection string!
 */
//db = mongoose.createConnection("mongodb://")
db = mongoose.createConnection("mongodb://localhost/persons")

//db = mongoose.createConnection("mongodb://mongo-t:fasdewr@157.245.75.184/persons?authSource=admin")
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
console.log("middlw")

//-----------middleware---------3&&4
app.use(async function (req, res, next) {
  try {

    let typeReq = req.method;
    let date = new Date();
    let ip = requestIp.getClientIp(req)
    let log = new Log({ typeReq: typeReq, ip: ip, date: date });
    // save model to database
    await log.save();
    let numLogs = rateLimit(req);
    if (numLogs >= 10) {
      let now = new Date();
      // let maxDate = await logs.find({}).sort({ date: -1 }).limit(1)
      let maxDate = await Log.findOne({}).sort({ date: -1 })
      let dif = now.getTime() - maxDate.date.getTime();

      var Seconds = dif / 1000;
      var Seconds_Between_Dates = Math.abs(Seconds);
      let sec = 60 - Seconds_Between_Dates;
      return res.json({ code: 200, data: "You can make up to ten requests per minute you have " + sec + " seconds left" })
    }
    else {
      next()
    }
  } catch (error) {
    console.log("not saved in logs " + error);
    next();
  }
})
async function rateLimit(req) {
  let ip = requestIp.getClientIp(req);
  let now = new Date();
  let minutesToAdd = -1;
  let minuteAgo = new Date(now.getTime() + minutesToAdd * 60000);
  let logs = await Log.find({ ip: ip, date: { $gte: minuteAgo } })
  let numLogs = logs.length;
  return numLogs;
}

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
