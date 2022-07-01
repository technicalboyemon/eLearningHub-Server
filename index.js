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

const { translate } = require("bing-translate-api");

// https://cryptic-temple-44121.herokuapp.com/

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
    const categoryCollection = database.collection("category");
    const commentsCollection = database.collection("comments");
    const quizCollection = database.collection("quiz");
    const quizSavedCollection = database.collection("quizSaved");

    app.post("/translate", async (req, res) => {
      translate(req.body.text, null, "ro", true)
        .then((r) => {
          console.log(r);
          res.json(r.translation);
        })
        .catch((err) => {
          console.log(err);
          res.json({ err: err });
        });
    });
    // ==============Quiz API===================
    app.post("/quiz/add", async (req, res) => {
      try {
        const result = await quizCollection.insertOne(req.body);
        console.log(result);
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/all", async (req, res) => {
      try {
        const quiz = await quizCollection.find({});
        const result = await quiz.toArray();
        res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/instructor/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const query = { instructorUid: email };
        const quiz = await quizCollection.find(query);
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/attend/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const quiz = await quizCollection.find({
          "showUsers.email": email,
        });
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/save/:userEmail", async (req, res) => {
      try {
        const { userEmail } = req.params;
        console.log(userEmail);
        const quiz = await quizSavedCollection.find({
          user: userEmail,
        });
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/attended/instructor/:userEmail", async (req, res) => {
      try {
        const { userEmail } = req.params;
        console.log(userEmail);
        const quiz = await quizSavedCollection.find({
          instructorUid: userEmail,
        });
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.get("/quiz/attended", async (req, res) => {
      try {
        const quiz = await quizSavedCollection.find({});
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });
    app.post("/quiz/save/:userEmail/:id", async (req, res) => {
      try {
        const { userEmail, id } = req.params;
        const result = await quizSavedCollection.insertOne(req.body);
        const done = await quizCollection.updateOne(
          { _id: ObjectId(id) },
          { $pull: { showUsers: { email: userEmail } } }
        );
        return res.json(done);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });

    app.get("/user/submittedQuiz/:userEmail", async (req, res) => {
      try {
        const { userEmail } = req.params;
        const quiz = await quizSavedCollection.find({
          user: userEmail,
        });
        const result = await quiz.toArray();
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });

    app.patch("/quiz/updateUser/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const done = await quizCollection.updateOne(
          { _id: ObjectId(id) },
          { $addToSet: { showUsers: { $each: req.body } } }
        );
        return res.json(done);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });

    // ==============Comment API===================

    app.post("/watch/comment", async (req, res) => {
      try {
        const { content, blog_id, blog_user_id, user } = req.body;
        const data = {
          user,
          content,
          blog_id,
        };
        // io.to(`${blog_id}`).emit("createComment", data);
        io.emit("createComment", data);
        const result = await commentsCollection.insertOne(data);
        return res.json(result);
      } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }
    });

    app.get("/watch/comment/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { blog_id: id };
        const blog = await commentsCollection.find(query);
        const result = await blog.toArray();
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

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const UpdateDoc = { $set: { isAdmin: true } };
      const result = await usersCollection.updateOne(filter, UpdateDoc);
      res.json(result);
    });

    // app.put("/users/profile/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const updatedUser = req.body;
    //   const filter = { email: user.email };
    //   const UpdateDoc = { $set: { photo: updatedUser.photo } };
    //   const result = await usersCollection.updateOne(filter, UpdateDoc);
    //   res.json(result);
    // });

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

    // ==================Category========

    // POST API - For category
    app.post("/category", async (req, res) => {
      const newUser = req.body;
      const result = await categoryCollection.insertOne(newUser);
      res.json(result);
    });
    // GET API - For category
    app.get("/category", async (req, res) => {
      const users = categoryCollection.find({});
      const result = await users.toArray();
      res.json(result);
    });
    // GET SINGLE API - For category
    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await categoryCollection.findOne(query);
      res.json(order);
    });

    //DELETE API - category
    app.delete("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await categoryCollection.deleteOne(query);
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
