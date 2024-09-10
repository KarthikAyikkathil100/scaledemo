const express = require('express');
const client = require('prom-client');
const axios = require('axios')
const osu = require('node-os-utils')
const cpu = osu.cpu


const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({register: client.register})
const app = express();

// metric for overall API time
const latencyChecker = new client.Gauge({
  labelNames: ['method', 'path'],
  name: 'latency_check',
  help: 'Metric to check latency'
})

// metric to check database queried time
const dbTimeChecker = new client.Gauge({
  labelNames: ['method', 'path'],
  name: 'db_check_time',
  help: 'Time for '
})

// metric for database query's time's histogram
const dbQueryHistory = new client.Histogram({
  labelNames: ['method', 'path'],
  name: 'db_time_hist',
  help: 'Get histogram of time take by DB queries',
  buckets: [0, 3, 7, 13, 15, 30, 50, 70, 100]
})

// metric for total error counts
const totalServerErrorsCountMetric = new client.Counter({
  labelNames: ['count_error'],
  name: 'server_error_count',
  help: 'This metric represents total 500 status codes sent to users',
})


app.use((req, res, next) => {
  const latency = latencyChecker.startTimer()
  next()
  latency({
    method: req.method,
    path: req.path
  }) // end 

  if (res.statusCode === 500) {
    totalServerErrorsCountMetric.inc({
      count: 'API_FAIL'
    })
  }
})


async function mockDB(i) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await axios.get('https://66b34cef7fba54a5b7ec5abc.mockapi.io/api/v1/tax')
      resolve()
    } catch (e) {
      console.log('error => ', e);
      reject(e);
    }
  });
}

app.get('/metrics', async (req, res) => {
  try {
      const data = await client.register.metrics();
      res.send(data);
    } catch (e) {
        res.statusCode(500).send('Error')
    }
})

app.get('/check', (req, res) => {
  res.send('Server says Hii');
});

// Testing usage
setInterval(async () => {
  const num = await cpu.usage();
  console.log('cpu usage => ', num)
}, 1000)

setInterval(async () => {
  const num = await cpu.free()
  console.log('free mem => ', num)
}, 1000)




app.get('/demo', async (req, res) => {
  try {
    const dbLatency = dbTimeChecker.startTimer()
    const dbHist = dbQueryHistory.startTimer()
    for (let i = 1; i < 3; i++) {
      await mockDB(i);
    }
    dbLatency({
      method: req.method,
      path: req.path
    })
    dbHist({
      method: req.method,
      path: req.path
    })
    res.status(200).send('Success');
  } catch (e) {
    res.status(500).send('Error');
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
