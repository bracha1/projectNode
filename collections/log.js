const { Schema } = require('mongoose');
const db = require('mongoose');
const logSchema = {
    ip: { type: String },
    reqType: { type: String },
    date: { type: Date }
}

const LogModel = db.model('log', logSchema);
module.exports.Log = LogModel;


