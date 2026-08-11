  const mongoose = require('mongoose');

  const leadSchema = new mongoose.Schema({
    leadName: { type: String, required: true },
    company: String,
    phone: String,
    email: String,
    source: String,
    status: { 
      type: String, 
      enum: ['new', 'contacted', 'qualified', 'lost'], 
      default: 'new' 
    },
    
    // Support Multiple Follow-ups
    followUps: [{
      date: { 
        type: Date, 
        required: true 
      },
      message: {
        type: String,
        trim: true
      },
      status: { 
        type: String, 
        enum: ['pending', 'done'], 
        default: 'pending' 
      }
    }],

    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin' 
    },

  }, { 
    timestamps: true 
  });

  // Optional: Add index for better performance on follow-up queries
  leadSchema.index({ 'followUps.date': 1 });

  // Virtual to get the next upcoming follow-up (useful for notifications)
  leadSchema.virtual('nextFollowUp').get(function() {
    if (!this.followUps || this.followUps.length === 0) return null;

    const today = new Date();
    const upcoming = this.followUps
      .filter(fu => fu.status === 'pending' && fu.date >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcoming.length > 0 ? upcoming[0] : null;
  });

  module.exports = mongoose.model('Lead', leadSchema);