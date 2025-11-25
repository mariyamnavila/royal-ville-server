const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config()

// middleware
app.use(cors())
app.use(express.json())

// royal-ville
// Xhjk4bah5U6ZDegv

// MongoDB connection

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster033.bpxhzqh.mongodb.net/?appName=Cluster033`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const roomsCollection = client.db('royalVille').collection('rooms');
        const reviewsCollection = client.db('royalVille').collection('reviews');

        app.get('/rooms', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.customer_email = email;
            }
            const cursor = roomsCollection.find(query);
            const result = await cursor.toArray();

            // bad way to aggregate data
            for (const room of result) {
                const roomId = room._id.toString();
                const reviews = await reviewsCollection.find({roomId}).toArray();
                room.reviews = reviews;
            }

            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Royal Ville is booking')
})

app.listen(port, () => {
    console.log(`Royal Ville server is running on port ${port}`);
})