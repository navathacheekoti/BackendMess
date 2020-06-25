const express = require('express')
const app = express()
const cors = require('cors')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const passportLocalMongoose = require('passport-local-mongoose')

const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);



const AutoIncrement = require('mongoose-sequence')(mongoose);



const bodyParser = require('body-parser')

const port = process.env.PORT || 3000

// mongoose.connect(
//     'mongodb://ds219839.mlab.com:19839',
//     {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       useFindAndModify: false,
//       useCreateIndex: true,
//       user: 'nav', // IMPORTANT TO HAVE IT HERE AND NOT IN CONNECTION STRING
//       pass: 'lallu17489', // IMPORTANT TO HAVE IT HERE AND NOT IN CONNECTION STRING
//       dbName: 'messcard', // IMPORTANT TO HAVE IT HERE AND NOT IN CONNECTION STRING
//     },
//     err => { throw err; },
//   );

mongoose
    .connect("mongodb://127.0.0.1:27017/", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('....Mongo Connected successfully'))
    .catch(err => console.log(err))

let StudentSchema = new mongoose.Schema({
    name: { type : String , required : true },
    username: { type : String , unique : true, required : true },
    hostel_name: { type : String , required : true },
    study: { type : String , required : true },
    address: { type : String , required : true },
    no_of_open_days: { type : Number , default : 0 },
    no_of_closed_days: { type : Number , default : 0 },
    fee_paid: { type : Number , default : 0 },
    type: String,
    totalfee: { type : Number , default : 0 },
    password: { type : String },
    card_dates: [{
        type: String
    }],
    activate: Boolean,
    date: Date,
    mess_fee_daily: [{
        date: { type: String ,unique:true},
        amount: { type: Number }
 
    }]
});
let MessBillSchema = new mongoose.Schema({
    
    date: {type:String,unique:true},
    amount:Number,
    upload_date: Date,
    no_of_open_cards: Number,
    bill_per_card:Number
});
let OpenCardsSchema = new mongoose.Schema({
    open_cards:Number,
    date: { type: String, unique: true }
    
});

StudentSchema.plugin(passportLocalMongoose)
StudentSchema.plugin(AutoIncrement, {
    inc_field: 'id'
});


let Student = mongoose.model("Student", StudentSchema);
let MessBill = mongoose.model("MessBill", MessBillSchema);
let OpenCards = mongoose.model("OpenCards", OpenCardsSchema);



//Passport Configuration
app.use(require("express-session")({
    secret: " Danerys Targeryan the chain breaker",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize())
app.use(passport.session())

passport.use('studentLocal', new LocalStrategy(Student.authenticate()));
passport.serializeUser(Student.serializeUser())
passport.deserializeUser(Student.deserializeUser())


app.use(bodyParser.json())
app.use(cors())


app.post('/register', (req, res) => {
    var newStudent = new Student({
        name: req.body.name,
        username: req.body.username,
        hostel_name: req.body.hostel_name,
        study: req.body.study,
        address: req.body.address,
        no_of_open_days: 0,
        no_of_close_ddays: 0,
        fee_paid: 0,
        type: req.body.type,
        totalfee: 0,
        card_dates: [],
        activate: true,
        date: new Date(),
        mess_fee_daily:[]
        
    })
    Student.register(newStudent, req.body.password, (err, student) => {
        if (err) {
            console.log(err);
            return res.send("register error")
        }
        passport.authenticate('studentLocal')(req, res, () => {
            console.log(student)
            res.send(student);
        })
    })

});


app.post('/login',
    passport.authenticate('studentLocal'),
    function (req, res) {
        res.send(req.user);
    }
);

// Warden get all the students Data 
app.get('/warden', (req, res) => {

    Student.find({
        type: 'student'
    }, (err, students) => {
        if (err) {
            res.send(err);
        } else {
            res.send(students);
        }
    });
})



app.get('/students', (req, res) => {
    Student.find({ type: 'student' }, (err, students) => {
        console.log(students.length)
        res.send(students)
    })
})
app.post('/messbill', (req, res) => {
    MessBill.find({
    }, (err, bills) => {
            if (err) {
            console.log(err)
            // res.send(err);
        } else {
            res.send(bills);
        }
    });
})
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}
app.post('/mess_bill_upload', (req, res) => {
    
    MessBill.create({
             upload_date: new Date(),
            date: req.body.date,
            amount: req.body.bill,
             no_of_open_cards: req.body.open_cards,
            bill_per_card:req.body.bill_per_card.toFixed(2)
        }, (err, bill) => {
            if (err) {
                // console.log(req.body.date,req.body.bill_per_card)

                    res.send(err)
                    // console.log(err)
            } else {
                calculateDailyMessBill(req.body.date,req.body.bill_per_card)
                // console.log(req.body.date,req.body.bill_per_card)
                // res.send(bill)
                // console.log(bill)
                bill=JSON.stringify({
                    amount:req.body.amount
                })
                res.send(bill)
                }
            });
})


// console.log(formatDate(new Date()))
app.get('/today_open_cards', (req, res) => {
    const today =  new Date()
    Student.find({ type: "student" }, (err, students) => {
        count = 0;
        for (let index = 0; index < students.length; index++) {
            // const element = array[index];
            cards=students[index].card_dates;
            for (let index = 0; index < cards.length; index++) {
                // const element = array[index];
                if (cards[index].includes(today))
                    count++;
            }
        }
        // console.log(students.length, count);
        today_open_cards = students.length - count;
        // console.log(today_open_cards);
        setInterval(todayCardsDb, 24 * 60 * 60 * 1000, today_open_cards)
        // TODO:server works 24/7 it works fine else remove below comment
        // todayCardsDb(today_open_cards)
        today_open_cards=JSON.stringify({
            today_open_cards,
            date: today
        })

        res.send(today_open_cards)

    })
})
const todayCardsDb = (today_open_cards) => {
    console.log(today_open_cards)
    // const today_open_cards=res
    OpenCards.create({
        date: formatDate(new Date(new Date().getFullYear(),new Date().getMonth())),
        open_cards:today_open_cards
    }, (err, bill) => {
        if (err) {
                // res.send(err)
                // console.log(err)
        } else {
            // res.send(bill)
                // console.log(bill)
            }
        });
}



app.get('/mess_bill', (req, res) => {
    MessBill.find({
    }, (err, bills) => {
        if (err) {
            res.send(err);
        } else {
            res.send(bills);
        }
    });
})
app.get('/load_open_cards', (req, res) => {
    OpenCards.find({
    }, (err, cards) => {
        if (err) {
            res.send(err);
        } else {
            res.send(cards);
        }
    });
})
app.post('/data', (req, res) => {

    Student.find({
            type:'student'
    }, (err, students) => {
        if (err) {
            res.send(err);
        } else {
            res.send(students);
        }
    });
})

updateDailyBill = (rno,obj) => {
    Student.updateOne({ username: rno },
            {
                $push: {
                       mess_fee_daily:obj 
                    
            }
            }, (err, student) => {
                if (err) {
                    console.log(err);
                } else {
                    // student.save();
                    console.log("working updateDailyBill");
                    // res.send(student);
        
                }
            })
}
messBillUpdate = (fee,rno) => {
    Student.updateOne({
        username: rno
    }, {
        $set: { totalfee: fee }
    }, (err, student) => {
            if (err) {
                console.log(err)
            }
            else {
                console.log(student+'updated')
            }
    })
}
calculateTotalMessBill = () => {
    Student.find({
            type: "student"
        }, (err, students) => {
            if (err) {
                // res.send(err);
                console.log(err)
            } else {
                for (let index = 0; index < students.length; index++) {
                    fee=0
                    for (let j = 0; j < students[index].mess_fee_daily.length; j++) {
                        mess = students[index].mess_fee_daily[j]
                        fee+=mess.amount
                    }
                    messBillUpdate(fee,students[index].username)
                }
            
            }
        });
}
// setInterval(calculateTotalMessBill,24*60*60*1000)

// calculateTotalMessBill()

//Total_leave_dates_update
no_of_open_cards_update = (no_of_days,rno) => {
    Student.updateOne({ username: rno }, {
        $set: {
            no_of_open_days: no_of_days,
        }
    }, (err, student) => {
        if (err) {
            // res.send(err);
            console.log(err)
        } else {
            console.log("no_of_open_cards_update")

        }
    })
}
no_of_leaves_update=(no_of_days,rno) => {
    Student.updateOne({ username: rno }, {
        $set: {
            no_of_closed_days: no_of_days,
        }
    }, (err, student) => {
        if (err) {
            // res.send(err);
            console.log(err)
        } else {
            console.log('no_of_leaves_update')

        }
    })
}

// Count TOtal No. of Leave Dates
total_leave_dates = () => {
    Student.find({
        type: "student"
    }, (err, students) => {
        if (err) {
            // res.send(err);
            console.log(err)
        } else {
            for (let index = 0; index < students.length; index++) {
                // console.log(students[index].mess_fee_daily.length)
                open_cards = 0;
                for (let j = 0; j < students[index].mess_fee_daily.length; j++) {
                    // const element = array[index];
                    // console.log(students[index].mess_fee_daily[j].amount)
                    if (students[index].mess_fee_daily[j].amount > 0) {
                        open_cards++;

                    }          
                        
                }
                // console.log(open_cards)
                no_of_open_cards_update(open_cards,students[index].username)
                no_of_leaves_update(students[index].card_dates.length,students[index].username) 
                // leave_dates_update(students[index].cardDates.length,students[index].username)
            }
            
            // console.log(students[0])
            // res.send({"hi":'j'})
            // res.send(obj1);
        }
    });
}

setInterval(total_leave_dates, 24 * 60 * 60 * 1000)
// Server works 24/7 it works fine
// TODO: if its not the remove comments below
// total_leave_dates()
calculateDailyMessBill = (date,amount) => {
    obj = {
        date,
        amount
    }

    Student.find({ type: 'student' }, (err, students) => {
        for (i in students) {
            if (students[i].card_dates.includes(obj.date)) {
                // Daily_fee update zero
                updateDailyBill(students[i].username, { date: obj.date, amount: 0 })
                calculateTotalMessBill()
                
            }
            else {
                console.log(students[i].username)
                //FEE should add
                updateDailyBill(students[i].username, obj)
                calculateTotalMessBill()
            }
        }

        // res.send({"succ":"ess"})
        // if(obj.date in )
    })
}

// app.post('/calculate_daily_mess_bill', (req, res) => {

//     obj = {
//         date: req.body.date,
//         amount:req.body.amount
//     }

//     Student.find({ type: 'student' }, (err, students) => {
//         for (i in students) {
//             if (students[i].card_dates.includes(obj.date)) {
//                 // Daily_fee update zero
//                 updateDailyBill(students[i].username, { date: obj.date, amount: 0 })
//                 calculateTotalMessBill()
                
//             }
//             else {
//                 console.log(students[i].username)
//                 //FEE should add
//                 updateDailyBill(students[i].username, obj)
//                 calculateTotalMessBill()
//             }
//         }

//         res.send({"succ":"ess"})
//         // if(obj.date in )
//     })
    
   
// })
app.post('/student', (req, res) => {

    const newdates = req.body.leave_dates.map(date => (date.substring(0, 10)));

    Student.updateOne({username: req.body.user.username},
        {
            $addToSet: {
                card_dates:newdates
        }
        },
        (err, student) => {
        if (err) {
            console.log(err);
        } else {
            // student.save();
            console.log("working", student);
            total_leave_dates()
            res.send(newdates);

        }
        });
});
app.get('/knowdata', (req, res) => {
    Student.find({}, (err, student) => {
        res.send(student);
    })
    // MessBill.find({}, (err, student) => {
    //     res.send(student);
    // });
    // OpenCards.find({}, (err, student) => {
    //     res.send(student);
    // });


})

app.listen(port, () => console.log(`Example app listening on port ${port}! ${new Date().getDate()}`))