require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db("BabyCare-8").collection("user");
    const productsCollection = client.db("BabyCare-8").collection("products");
    const orderCollection = client.db("BabyCare-8").collection("orders");

    // Send a ping to confirm a successful connection

    app.post("/api/v1/register", async (req, res) => {
      const { Name, Email, Password } = req.body;
      // Check if email already exists
      const existingUser = await userCollection.findOne({ Email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(Password, 10);

      // Insert user into the database
      await userCollection.insertOne({ Name, Email, Password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { Email, Password } = req.body;
      // Find user by email
      const user = await userCollection.findOne({ Email });

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(Password, user.Password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.Email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    app.get("/products", async (req, res) => {
      const queryUrl = req.query;
      let modifyQuery = {};
      if (queryUrl.category) {
        modifyQuery.category = queryUrl.category;
      }
      if (queryUrl.rating) {
        modifyQuery.rating = { $gte: Number(queryUrl.rating) };
      }
      if (queryUrl.price) {
        modifyQuery.price = {
          $lte: Number(queryUrl.price),
        };
      }

      const result = await productsCollection.find(modifyQuery).toArray();
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/flash-sale", async (req, res) => {
      const falseSale = await productsCollection
        .find()
        .sort({ createdAt: 1 })
        .toArray();

      const filter = falseSale.filter((flash) => flash.isFlash == true);
      res.send(filter);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
