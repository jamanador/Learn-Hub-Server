const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const SSLCommerzPayment = require("sslcommerz-lts");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.port || 5000;
// middleware use
app.use(cors());
app.use(express.json());

const store_id = process.env.store_Id;
const store_passwd = process.env.store_Pass;
const is_live = false; //true for live, false for sandbox

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

const tran_id = new ObjectId().toString();

app.post("/confirmorders", async (req, res) => {
  const course = await ordersCollection.findOne({
    _id: new ObjectId(req.body._id),
  });
  const order = req.body;
  const data = {
    total_amount: order.price,
    currency: "BDT",
    tran_id: tran_id, // use unique tran_id for each api call
    success_url: `http://localhost:5000/confirmpayment/success/${tran_id}`,
    fail_url: "http://localhost:3030/fail",
    cancel_url: "http://localhost:3030/cancel",
    ipn_url: "http://localhost:3030/ipn",
    shipping_method: "Courier",
    product_name: order.courseName,
    product_category: "Course",
    product_profile: "general",
    cus_name: order.customer,
    cus_email: order.customerEmail,
    cus_add1: order.adress,
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: order.phone,
    cus_fax: "01711111111",
    ship_name: "Customer Name",
    ship_add1: "Dhaka",
    ship_add2: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: 1000,
    ship_country: "Bangladesh",
  };

  // console.log(data);
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  sslcz.init(data).then((apiResponse) => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL;
    res.send({ url: GatewayPageURL });
    const finalOrder = {
      course,
      paidStatus: false,
      transcationId: tran_id,
    };
    const result = ordersCollection.insertOne(finalOrder);
    console.log(result);
  });

  app.post("/confirmpayment/success/:tranId", async (req, res) => {
    console.log(req.params.tranId);
    const result = await ordersCollection.updateOne(
      { transcationId: req.params.tranId },
      {
        $set: {
          paidStatus: true,
        },
      }
    );
    if (result.modifiedCount > 0) {
      res.redirect(
        `http://localhost:3000/confirmpayment/success/${req.params.tranId}`
      );
    }
  });
});

app.post("/orders", async (req, res) => {
  try {
    const product = req.body;
    const query = {
      coursesId: product.coursesId,
      customerEmail: product.customerEmail,
    };
    const alreadyBooked = await ordersCollection.find(query).toArray();
    if (alreadyBooked.length) {
      return res.send({
        sucess: false,
        message: `You already have ${product.courseName} Course on Cart`,
      });
    }
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
  } catch (error) {}
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
app.delete("/users/admin/:id", verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  } catch (error) {}
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
app.delete("/courses/:id", verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await coursesCollection.deleteOne(query);
    if (result.acknowledged) {
      res.send(result);
    }
  } catch (error) {
    res.send(error.message);
  }
});
app.listen(port, () => {
  console.log("This port runnig on", port);
});
