const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const { Schema } = mongoose
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

main().catch(err => console.log(err))

async function main() {
    await mongoose.connect(process.env.MONGO_URI)
}

const userSchema = new Schema({
    username: { type: String, require: true, unique: true },
    exercises: [{
        description: String,
        duration: Number,
        date: Date
    }]
}, { versionKey: false })

const User = mongoose.model('User', userSchema)
const ERROR = { error: "There was an error while getting the users." };

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id'); // Query all users and project only 'username' and '_id' fields
    const userObjects = users.map(user => ({ username: user.username, _id: user._id }));
    res.json(userObjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});




app.post('/api/users', async (req, res) => {
    const username = req.body.username;
    try {
  const user = await User.create({ username: username });
  res.json({ _id: user._id, username: user.username });
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Failed to create a new user.' });
}

})

app.get('/api/users/:id/logs', async (req, res) => {
  try {
    const userId = req.params.id;
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(0); // Default to the beginning of time
    const toDate = req.query.to ? new Date(req.query.to) : new Date(); // Default to the current date
    const limit = parseInt(req.query.limit);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let log = user.exercises
      .filter(exercise => {
        const exerciseDate = new Date(exercise.date);
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      })
      .map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      }));

    const count = log.length;

    if (limit) {
      log = log.slice(0, limit);
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: count,
      log: log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user logs.' });
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  try {
    // Find the user by _id
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Create a new exercise object
    const exercise = {
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    };

    // Add the exercise to the user's exercises array
    user.exercises.push(exercise);

    // Save the updated user
    await user.save();

    // Return the updated user object with the exercise fields added
    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add exercise.' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
