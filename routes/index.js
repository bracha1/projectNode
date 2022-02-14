const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const formidable = require('formidable');
const http = require('http');
const requestIp = require('request-ip');
const multer = require('multer')


const { Person } = require('../collections/person');
const { Profession } = require("../collections/profession");
const { Log } = require("../collections/log");

router.get('/populate-mongo', async (req, res, next) => {
    let { data: persons } = await axios.get("https://raw.githubusercontent.com/dominictarr/random-name/master/names.json");
    let { data: professions } = await axios.get('https://raw.githubusercontent.com/dariusk/corpora/master/data/humans/occupations.json');
    professions = professions.occupations;
    professions = professions.map(p => ({
        name: p,
        salary: getRandomInt(6000, 30000),
        avgAge: getRandomInt(21, 120)
    }))
    await Profession.insertMany(professions)
    // persons = persons.map(p=>({
    //     name:p,
    //     age:getRandomInt(0,30),
    // }))
    for (let person of persons) {
        let hasProfession = getRandomInt(0, 3) > 1;
        if (hasProfession) {
            let pro = await Profession.find().limit(1).skip(getRandomInt(0, professions.length));
            pro = pro[0];
            Person.findOneAndUpdate({ name: person }, {
                $set: {
                    name: person,
                    age: getRandomInt(21, 120),
                    profession: pro._id
                }
            }, { upsert: true }).then()
        } else {
            Person.findOneAndUpdate({ name: person }, {
                $set: {
                    name: person,
                    age: getRandomInt(21, 120),
                    profession: null
                }
            }, { upsert: true }).then()
        }

    }

    return res.json({ code: 200 })

});
router.get('/', async (req, res) => {
    let p = await Person.findOne();
    return res.json({ code: 200, data: p })
})

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
function getIpAndDate(req) {
    let date = new Date();
    let ip = requestIp.getClientIp(req)
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ipAndDate = ip + " " + hours + ":" + minutes
    return ipAndDate;
}

router.get('/', async (req, res) => {
    let person = await Person.findOne();
    let profession = await Profession.findOne();
    return res.json({ code: 200, data: { person, profession } })
})
//---ex1

router.get('/getAvgAgeHasNoProfession', async (req, res) => {
    // let persons = await Person.find({ profession: null });
    let avg = await Person.aggregate([
        { "$match": { profession: null } },
        {
            "$group": {
                "_id": null,
                "Average": { "$avg": "$age" }
            }

        }
    ])
    return res.json({ code: 200, data: { avg } })
})


//---ex2
router.get('/getMaxSalaryProfession', async (req, res) => {
    let profession = await Profession.findOne({}).sort({ salary: -1 })
    let persons = await Person.find({ profession: profession._id })
    let numPersons = persons.length

    return res.json({ code: 200, data: profession, numPersons })
})




//---ex3

router.get('/get5Proffession', async (req, res) => {
    let maxSalaries = await Profession.find({}).sort({ salary: -1 }).limit(5)
    return res.json({ code: 200, data: { maxSalaries } })

})

//---ex4
router.get('/getDistinctAge', async (req, res) => {
    let distinctAges = await Person.distinct('age');
    return res.json({ code: 200, data: { distinctAges } });
})
//---ex5

router.patch('/updateSalary', async (req, res) => {
    let person = await Person.findOne({ name: req.body.name })
    let profession;
    if (person.profession != null) {
        profession = await Profession.findByIdAndUpdate(person.profession, { salary: req.body.salary }, { new: true })
        return res.json({ code: 200, data: { person, profession } });
    }
    else {
        return res.json({ code: 200, data: "not have profession" });
    }

})

//----------node
//----------1

router.get('/writeIpAndDate', async (req, res) => {
    let date = new Date();
    let ip = requestIp.getClientIp(req)
    fs.appendFile('ipFile.txt', ip + " " + date + '\r\n', (err, data) => {
        if (err) {
            throw err;
        }

        return res.json({ code: 200, data: { ip, date } })
    })

})

//-------2


/////upload image//////
const imageStorage = multer.diskStorage({
    // Destination to store image     
    destination: 'public/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now()
            + path.extname(file.originalname))
        // file.fieldname is name of the field (image)
        // path.extname get the uploaded file extension
    }
});

const imageUpload = multer({
    storage: imageStorage,
    limits: {
        fileSize: 1000000 // 1000000 Bytes = 1 MB
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg)$/)) {
            // upload only png and jpg format
            let ip = requsetIp.getClientIp(req)
            fs.appendFile('file2.txt', ip + " " + file.originalname + '\r\n', (err, data) => {
                if (err) {
                    throw err;
                }
            })
            return cb(new Error('Please upload a Image'))
        }
        cb(undefined, true)
    }
})

// For Single image upload
router.post('/uploadImage', imageUpload.single('image'), (req, res) => {
    res.send(req.file)
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})



module.exports = router;
