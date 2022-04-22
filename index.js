const express = require("express");
const cors = require("cors");
const app = express();
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const { createServer } = require("http");
const { Server, Socket } = require("socket.io");
app.use(cors());
app.use(express.json());
require("dotenv").config();

// Socket.io
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("joinRoom", (id) => {
    socket.join(id);
    console.log({ joinRoom: socket.adapter.rooms });
  });

  socket.on("outRoom", (id) => {
    socket.leave(id);
    console.log({ outRoom: socket.adapter.rooms });
  });

  socket.on("disconnect", () => {
    console.log(socket.id + " disconnected");
  });
});

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

    app.post("/watch/comment", async (req, res) => {
      try {
        const { content, blog_id, blog_user_id, user } = req.body;
        console.log(req.body);
        const newComment = new Comments({
          user: user._id,
          content,
          blog_id,
          blog_user_id,
        });

        const data = {
          ...newComment._doc,
          user,
          createdAt: new Date().toISOString(),
        };

        io.to(`${blog_id}`).emit("createComment", data);

        // await newComment.save();
        const result = await coursesCollection.insertOne(data);
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });

    // PUT API - Filter By Email [USER]
    app.get("/users/account/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      res.json(result);
    });

    app.get("/watch/comment/", async (req, res) => {
      try {
        const { id } = req.params;
        const data = await coursesCollection.aggregate([
          {
            $facet: {
              totalData: [
                {
                  $match: {
                    blog_id: ObjectId(id),
                    comment_root: { $exists: false },
                    reply_user: { $exists: false },
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    let: { email: "$user" },
                    pipeline: [
                      { $match: { $expr: { $eq: ["$_id", "$$email"] } } },
                      { $project: { name: 1 } },
                    ],
                    as: "user",
                  },
                },
                { $unwind: "$user" },
                {
                  $lookup: {
                    from: "comments",
                    let: { cm_id: "$replyCM" },
                    pipeline: [
                      { $match: { $expr: { $in: ["$_id", "$$cm_id"] } } },
                      {
                        $lookup: {
                          from: "users",
                          let: { user_id: "$user" },
                          pipeline: [
                            {
                              $match: { $expr: { $eq: ["$_id", "$$user_id"] } },
                            },
                            { $project: { name: 1, avatar: 1 } },
                          ],
                          as: "user",
                        },
                      },
                      { $unwind: "$user" },
                      {
                        $lookup: {
                          from: "users",
                          let: { user_id: "$reply_user" },
                          pipeline: [
                            {
                              $match: { $expr: { $eq: ["$_id", "$$user_id"] } },
                            },
                            { $project: { name: 1, avatar: 1 } },
                          ],
                          as: "reply_user",
                        },
                      },
                      { $unwind: "$reply_user" },
                    ],
                    as: "replyCM",
                  },
                },
                { $sort: { createdAt: -1 } },
              ],
              totalCount: [
                {
                  $match: {
                    blog_id: ObjectId(id),
                    comment_root: { $exists: false },
                    reply_user: { $exists: false },
                  },
                },
                { $count: "count" },
              ],
            },
          },
          {
            $project: {
              count: { $arrayElemAt: ["$totalCount.count", 0] },
              totalData: 1,
            },
          },
        ]);

        return res.json({ comments });
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
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

    // Get Single API - Filter By Email [Student]
    app.get("/users/student", async (req, res) => {
      const cursor = usersCollection.find({ isStudent: true });
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

    // Get Single API - Filter By Email [USER]
    app.get("/course/account", async (req, res) => {
      let query = {};
      const email = req.query.email;
      console.log(email);
      if (email) {
        query = { email: email };
      }
      const cursor = coursesCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
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

    // Get Single API - Filter By Email [USER]
    app.get("/order/account", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    // GET SINGLE API - For ORDER
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.json(order);
    });

    //DELETE API - ORDeR
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello eLearning Platform!");
});

http.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
