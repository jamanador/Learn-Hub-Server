const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.port || 5000;
const courses = require("./data/courses.json");

app.use(cors());

app.get("/", (req, res) => {
  res.send(courses);
});
app.get("/courses", (req, res) => {
  res.send(courses);
});

// app.get("/courses/:id", (req, res) => {
//   const id = req.params.id;
//   const singleCourse = courses.find((course) => course.id == id);
//   if (!singleCourse) {
//     res.send([{ status: "empty" }]);
//   }
//   res.send(singleCourse);
// });

app.listen(port, () => {
  console.log("This port runnig on", port);
});
