const express = require("express");
const cors = require("cors");
const app = express();
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@elearninghub.bwmnt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const database = client.db("eLearning");
    const usersCollection = database.collection("users");
    const coursesCollection = database.collection("courses");
    const orderCollection = database.collection("order");

    // ===================== USER API ========================

    // POST API - For USER
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.json(result);
    });

    // GET API - For USER
    app.get("/users", async (req, res) => {
      const users = usersCollection.find({});
      const result = await users.toArray();
      res.json(result);
    });

    // GET SINGLE API - For USER

    // app.get("/user/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const users = await usersCollection.findOne(query);
    //   res.json(users);
    // });

    // Get Single API - Filter By Email [USER]
    app.get("/users/account", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    // Get Single API - Filter By Email [Instructor]
    app.get("/users/instructor", async (req, res) => {
      const cursor = usersCollection.find({ isInstructor: true });
      const result = await cursor.toArray();
      res.json(result);
    });

    // PUT API - Filter By Email [USER]
    app.put("/users/account/:email", async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          name: updatedUser.name,
          phone: updatedUser.phone,
          about: updatedUser.about,
          photo: updatedUser.photo,
          national: updatedUser.national,
          profession: updatedUser.profession,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.json(result);
    });

    //DELETE API - USER
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.json(result);
    });

    // ===================== COURSE API ========================

    // POST API - For Course
    app.post("/courses", async (req, res) => {
      const newUser = req.body;
      const result = await coursesCollection.insertOne(newUser);
      res.json(result);
    });

    // GET API - For Course
    app.get("/courses", async (req, res) => {
      const users = coursesCollection.find({});
      const result = await users.toArray();
      res.json(result);
    });

    // GET SINGLE API - For Course
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const users = await coursesCollection.findOne(query);
      res.json(users);
    });

    //DELETE API - Course
    app.delete("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await coursesCollection.deleteOne(query);
      res.json(result);
    });

    // ===================== ORDER API ========================

    // POST API - For ORDER
    app.post("/order", async (req, res) => {
      const newUser = req.body;
      const result = await orderCollection.insertOne(newUser);
      res.json(result);
    });

    // GET API - For ORDER
    app.get("/order", async (req, res) => {
      const users = orderCollection.find({});
      const result = await users.toArray();
      res.json(result);
    });

    // GET SINGLE API - For ORDER
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.json(order);
    });

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello eLearning Platform!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
