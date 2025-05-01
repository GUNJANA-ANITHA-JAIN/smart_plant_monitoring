const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection (removed deprecated options)
mongoose.connect('mongodb://localhost:27017/plant_twin')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Plant State Schema with custom _id type
const plantStateSchema = new mongoose.Schema({
  _id: Number, // Using Number instead of ObjectId for simplicity
  state: String,
  moisture: Number,
  light: Number,
  description: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: true }); // Ensure _id is included

// Models
const PlantState = mongoose.model('PlantState', plantStateSchema);
const PlantHistory = mongoose.model('PlantHistory', plantStateSchema);

// Current state tracker
let currentStateId = 1;

// Initialize with predefined states (using Number _id)
const initializeStates = async () => {
  const states = [
    { _id: 1, state: "healthy", moisture: 65, light: 800, description: "Optimal conditions" },
    { _id: 2, state: "light_deprived", moisture: 60, light: 150, description: "Needs more light" },
    { _id: 3, state: "dehydrated", moisture: 25, light: 700, description: "Needs watering" },
    { _id: 4, state: "stressed", moisture: 20, light: 100, description: "Needs both water and light" },
    { _id: 5, state: "overwatered", moisture: 90, light: 600, description: "Too much water" }
  ];

  try {
    await PlantState.deleteMany({});
    await PlantState.insertMany(states);
    console.log('Initialized 5 plant states');
  } catch (err) {
    console.error('Error initializing states:', err);
  }
};

// Generate 100 historical records
const generateHistoricalData = async () => {
  try {
    const count = await PlantHistory.countDocuments();
    if (count === 0) {
      const now = Date.now();
      const records = [];
      const states = await PlantState.find().lean();

      for (let i = 0; i < 100; i++) {
        const randomState = states[Math.floor(Math.random() * states.length)];
        records.push({
          ...randomState,
          _id: undefined, // Let MongoDB generate new ID
          timestamp: new Date(now - (99 - i) * 60000) // Spread over 99 minutes
        });
      }

      await PlantHistory.insertMany(records);
      console.log('Generated 100 historical records');
    }
  } catch (err) {
    console.error('Error generating historical data:', err);
  }
};

// Routes
app.get('/api/state', async (req, res) => {
  try {
    const state = await PlantState.findById(currentStateId);
    
    // Store in history (without _id to auto-generate)
    const historyRecord = { ...state.toObject(), _id: undefined };
    await PlantHistory.create(historyRecord);
    
    res.json(state);
  } catch (err) {
    console.error('Error getting state:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await PlantHistory.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(history);
  } catch (err) {
    console.error('Error getting history:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/water', async (req, res) => {
  try {
    const current = await PlantState.findById(currentStateId);
    let newStateId;
    
    if (current.state === 'dehydrated') newStateId = 1;
    else if (current.state === 'stressed') newStateId = 2;
    else newStateId = 5; // overwatered
    
    currentStateId = newStateId;
    const newState = await PlantState.findById(newStateId);
    res.json(newState);
  } catch (err) {
    console.error('Error processing watering:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/light', async (req, res) => {
  try {
    const current = await PlantState.findById(currentStateId);
    let newStateId;
    
    if (current.state === 'light_deprived') newStateId = 1;
    else if (current.state === 'stressed') newStateId = 3;
    else newStateId = currentStateId; // no change
    
    currentStateId = newStateId;
    const newState = await PlantState.findById(newStateId);
    res.json(newState);
  } catch (err) {
    console.error('Error changing light:', err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize and start server
const startServer = async () => {
  try {
    await initializeStates();
    await generateHistoricalData();
    
    app.listen(3001, () => {
      console.log('Server running on http://localhost:3001');
    });
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

startServer();