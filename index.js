const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.port || 5000;
// middleware use
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.learnHubDb}:${process.env.learnHubDbPass}@cluster0.chgrg5k.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized Access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.access_Token, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function dbConnect() {
  try {
    client.connect();
    console.log("Database Connected");
  } catch (error) {
    console.log(error.message, error.name);
  }
}
dbConnect().catch((err) => console.log(err.name));

const coursesCollection = client.db("LearnHubDb").collection("courses");
const ordersCollection = client.db("LearnHubDb").collection("orders");
const userCollection = client.db("LearnHubDb").collection("users");

app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user) {
    const token = jwt.sign({ email }, process.env.access_Token, {
      expiresIn: "365d",
    });
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "forbidden Acccess" });
});

app.post("/orders", async (req, res) => {
  try {
    const product = req.body;
    const result = await ordersCollection.insertOne(product);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.get("/orders", async (req, res) => {
  try {
    const email = req.query.email;
    const query = { customerEmail: email };
    const result = await ordersCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});
app.get("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await ordersCollection.findOne(query);
    res.send(result);
  } catch (error) {}
});
app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await ordersCollection.deleteOne(query);
    res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});
app.post("/users", async (req, res) => {
  try {
    const user = req.body;
    const result = await userCollection.insertOne(user);
    res.send(result);
  } catch (error) {
    console.log(error.name);
  }
});
app.get("/users", async (req, res) => {
  try {
    const query = {};
    const result = await userCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});
app.get("/users/admin/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    res.send({
      sucsess: true,
      isAdmin: user?.role === "admin",
    });
  } catch (error) {
    res.send({
      sucsess: false,
      error: error.message,
    });
  }
});
app.get("/showservices", async (req, res) => {
  try {
    const query = {};
    const cursor = coursesCollection.find(query);
    const result = await cursor.limit(3).toArray();
    res.send(result);
  } catch (error) {}
});
app.post("/courses", async (req, res) => {
  try {
    const courses = req.body;
    const result = await coursesCollection.insertOne(courses);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.get("/courses", async (req, res) => {
  const query = {};
  const result = await coursesCollection.find(query).toArray();
  res.send(result);
});

app.get("/", async (req, res) => {
  const query = {};
  const result = await coursesCollection.find(query).toArray();
  res.send(result);
});

app.get("/courses/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const result = await coursesCollection.findOne(filter);
  res.send(result);
});

app.listen(port, () => {
  console.log("This port runnig on", port);
});
