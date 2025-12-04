const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Get steps for a specific period (default: today)
router.get('/steps', async (req, res) => {
  const { accessToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[STEPS] Fetching for ${days} day(s) from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    let dailySteps = [];
    let totalSteps = 0;
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let daySteps = 0;
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const stepValue = point.value[0]?.intVal || 0;
                daySteps += stepValue;
              });
            }
          });
        }
        
        dailySteps.push({ date: bucketDate, steps: daySteps });
        totalSteps += daySteps;
        console.log(`[STEPS] ${bucketDate}: ${daySteps}`);
      });
    }
    
    res.json({
      success: true,
      data: { 
        totalSteps: totalSteps,
        dailySteps: dailySteps,
        days: parseInt(days),
        average: Math.round(totalSteps / parseInt(days))
      },
      debug: {
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    });
  } catch (err) {
    console.error('[STEPS] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get heart rate for a specific period
router.get('/heart-rate', async (req, res) => {
  const { accessToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[HEART RATE] Fetching for ${days} day(s) from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.heart_rate.bpm'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    let heartRates = [];
    let dailyHeartRates = [];
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let dayHeartRates = [];
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const hrValue = point.value[0]?.fpVal || 0;
                if (hrValue > 0) {
                  heartRates.push(hrValue);
                  dayHeartRates.push(hrValue);
                }
              });
            }
          });
        }
        
        if (dayHeartRates.length > 0) {
          const avgHR = Math.round(dayHeartRates.reduce((a, b) => a + b) / dayHeartRates.length);
          dailyHeartRates.push({ date: bucketDate, average: avgHR, dataPoints: dayHeartRates.length });
          console.log(`[HEART RATE] ${bucketDate}: avg=${avgHR}, points=${dayHeartRates.length}`);
        }
      });
    }
    
    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length)
      : 0;
    
    res.json({
      success: true,
      data: { 
        average: avgHeartRate,
        dailyAverages: dailyHeartRates,
        totalDataPoints: heartRates.length,
        days: parseInt(days)
      },
      debug: {
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0,
        totalHeartRateReadings: heartRates.length
      }
    });
  } catch (err) {
    console.error('[HEART RATE] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get today's steps
router.get('/steps-today', async (req, res) => {
  const { accessToken } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // Get today's date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const startTime = startOfToday.getTime();
    const endTime = endOfToday.getTime();
    
    console.log(`[STEPS TODAY] Fetching from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[STEPS TODAY] Raw response:', JSON.stringify(response.data, null, 2));
    
    let stepsToday = 0;
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const stepValue = point.value[0]?.intVal || 0;
                stepsToday += stepValue;
                console.log(`[STEPS TODAY] Found: ${stepValue} steps`);
              });
            }
          });
        }
      });
    }
    
    console.log(`[STEPS TODAY] Total for today: ${stepsToday}`);
    
    res.json({
      success: true,
      data: { steps: stepsToday },
      debug: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    });
  } catch (err) {
    console.error('[STEPS TODAY] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get Heart Points
router.get('/heart-points', async (req, res) => {
  const { accessToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[HEART POINTS] Fetching from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    // Heart points are calculated from heart rate data
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.heart_rate.bpm'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[HEART POINTS] Raw response:', JSON.stringify(response.data, null, 2));
    
    let heartRates = [];
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const hrValue = point.value[0]?.fpVal || 0;
                if (hrValue > 0) {
                  heartRates.push(hrValue);
                  console.log(`[HEART POINTS] Found HR: ${hrValue} bpm`);
                }
              });
            }
          });
        }
      });
    }
    
    // Heart Points calculation: roughly average of heart rates
    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length)
      : 0;
    
    console.log(`[HEART POINTS] Average: ${avgHeartRate}, Data points: ${heartRates.length}`);
    
    res.json({
      success: true,
      data: { 
        heartPoints: avgHeartRate,
        avgHeartRate: avgHeartRate,
        heartRateDataPoints: heartRates.length
      },
      debug: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0,
        heartRateValues: heartRates
      }
    });
  } catch (err) {
    console.error('[HEART POINTS] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get target steps (default 10000 per day)
router.get('/target-steps', async (req, res) => {
  try {
    // Google Fit default is typically 8000 steps per day
    // Some devices/accounts use 10000
    // We'll return the standard Google Fit default
    const targetSteps = 10000;
    
    res.json({
      success: true,
      data: { 
        targetSteps: targetSteps,
        dailyTarget: targetSteps
      }
    });
  } catch (err) {
    console.error('[TARGET STEPS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Original endpoint (kept for compatibility)
router.get('/data', async (req, res) => {
  const { accessToken, days = 7 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[DATA] Fetching from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          },
          {
            dataTypeName: 'com.google.heart_rate.bpm'
          },
          {
            dataTypeName: 'com.google.active_minutes'
          },
          {
            dataTypeName: 'com.google.calories.expended'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[DATA] Raw response:', JSON.stringify(response.data, null, 2));
    
    let totalSteps = 0;
    let heartRates = [];
    let activeMinutes = 0;
    let caloriesExpended = 0;
    let dateRanges = [];
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        dateRanges.push(bucketDate);
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                if (dataset.dataTypeName === 'com.google.step_count.delta' && point.value) {
                  const stepValue = point.value[0]?.intVal || 0;
                  totalSteps += stepValue;
                  console.log(`[DATA] Steps: ${stepValue}`);
                } 
                else if (dataset.dataTypeName === 'com.google.heart_rate.bpm' && point.value) {
                  const hrValue = point.value[0]?.fpVal || 0;
                  if (hrValue > 0) {
                    heartRates.push(hrValue);
                    console.log(`[DATA] Heart Rate: ${hrValue}`);
                  }
                }
                else if (dataset.dataTypeName === 'com.google.active_minutes' && point.value) {
                  const activeValue = point.value[0]?.intVal || 0;
                  activeMinutes += activeValue;
                  console.log(`[DATA] Active Minutes: ${activeValue}`);
                }
                else if (dataset.dataTypeName === 'com.google.calories.expended' && point.value) {
                  const calorieValue = point.value[0]?.fpVal || 0;
                  caloriesExpended += calorieValue;
                  console.log(`[DATA] Calories: ${calorieValue}`);
                }
              });
            }
          });
        }
      });
    }
    
    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length) 
      : 0;
    
    const result = {
      success: true, 
      data: { 
        steps: totalSteps,
        heartRate: heartRates,
        avgHeartRate: avgHeartRate,
        activeMinutes: activeMinutes,
        calories: Math.round(caloriesExpended),
        dateRange: `${dateRanges[0]} to ${dateRanges[dateRanges.length - 1]}`,
        daysWithData: dateRanges.length
      },
      debug: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    };
    
    console.log('[DATA] Google Fit Result:', result);
    res.json(result);
  } catch (err) {
    console.error('[DATA] Google Fit API error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch Google Fit data' });
  }
});

module.exports = router;
