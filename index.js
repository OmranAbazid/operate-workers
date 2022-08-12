const ZB = require("zeebe-node");
const express = require("express");
const app = express();
const cors = require("cors");
const zbc = new ZB.ZBClient("localhost:26500");
const port = 2000;
let workers = [];

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function handler(job, _, worker) {
  worker.log("Task variables", job.variables);

  // Task worker business logic goes here
  const updateToBrokerVariables = {
    updatedProperty: "newValue",
  };

  return job.complete(updateToBrokerVariables);
}

app.get("/retrieve/:activityId", (req, res) => {
  const worker = workers.find((worker) => worker.id === req.params.activityId);
  if (!worker) {
    return res.send({});
  }

  const { started, code } = worker;
  res.send({ started, code });
});

app.post("/create/:activityId", (req, res) => {
  workers.push({
    id: req.params.activityId,
    started: false,
    code: req.body.code,
  });

  res.send("Created");
});

app.post("/start/:activityId", (req, res) => {
  const localHandler = new Function(req.body.code + ";\nreturn handler;");

  workers = workers.map((worker) => {
    if (worker.id === req.params.activityId) {
      return {
        id: req.params.activityId,
        started: true,
        worker: zbc.createWorker("test", localHandler()),
        code: req.body.code,
      };
    }

    return worker;
  });

  console.log("--------started worker------");
  res.send("started");
});

app.get("/stop/:activityId", (req, res) => {
  workers = workers.map((worker) => {
    if (worker.id === req.params.activityId) {
      worker.worker.close();
      return {
        ...worker,
        started: false,
      };
    }

    return worker;
  });

  console.log("-----closed worker------");
  res.send("stoped");
});

app.get("/allWorkers", (req, res) => {
  res.send(workers.map(({ id, started, code }) => ({ id, started, code })));
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
