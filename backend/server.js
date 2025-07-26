const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/wastePickupDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Request Model
const RequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  mobile: { type: String, required: true },
  items: [{
    type: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'rejected'],
    default: 'pending'
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  timestamp: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, { timestamps: true });

const Request = mongoose.model('Request', RequestSchema);

// API Routes
app.post('/api/requests', async (req, res) => {
  try {
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'At least one item must be selected' });
    }

    const processedItems = req.body.items.map(item => ({
      type: item.type,
      quantity: Number(item.quantity)
    }));

    const newRequest = new Request({
      name: req.body.name,
      address: req.body.address,
      mobile: req.body.mobile,
      items: processedItems
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error saving request:', err);
    res.status(400).json({ 
      error: 'Failed to save request',
      details: err.message 
    });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    const requests = await Request.find(filter).sort({ timestamp: -1 });
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.patch('/api/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const update = { status };
    if (status === 'completed') {
      update.completedAt = new Date();
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(400).json({ error: 'Failed to update status' });
  }
});

app.get('/api/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await response.json();

    if (data.length > 0) {
      res.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name
      });
    } else {
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (err) {
    console.error('Geocoding error:', err);
    res.status(500).json({ error: 'Geocoding service error' });
  }
});

app.post('/api/requests/:id/coordinates', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { coordinates: { lat, lng } },
      { new: true }
    );
    res.json(updatedRequest);
  } catch (err) {
    console.error('Error saving coordinates:', err);
    res.status(400).json({ error: 'Failed to save coordinates' });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    const deletedRequest = await Request.findByIdAndDelete(req.params.id);
    
    if (!deletedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(400).json({ error: 'Failed to delete request' });
  }
});

// Frontend Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/user.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/delivery', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/delivery.html'));
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});