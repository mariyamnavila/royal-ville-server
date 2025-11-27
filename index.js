require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;


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
        // await client.connect();

        const roomsCollection = client.db('royalVille').collection('rooms');
        const reviewsCollection = client.db('royalVille').collection('reviews');

        // http://localhost:3000/rooms
        // http://localhost:3000/rooms?min=2&max=222&sort=asc
        // http://localhost:3000/sort=asc
        app.get('/rooms', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if (email) {
                query.customer_email = email;
            }

            const { min, max } = req.query;
            if (min && max) {
                query = { pricePerNight: { $gte: parseInt(min), $lte: parseInt(max) } };
            }

            const sortOrder = req.query.sort;

            const sortOptions = {};
            if (sortOrder === 'asc') {
                sortOptions.pricePerNight = 1; // Ascending order
            } else if (sortOrder === 'desc') {
                sortOptions.pricePerNight = -1; // Descending order
            }

            const cursor = roomsCollection.find(query).sort(sortOptions);
            const result = await cursor.toArray();

            // bad way to aggregate data
            for (const room of result) {
                const roomId = room._id.toString();
                const reviews = await reviewsCollection.find({ roomId }).toArray();
                room.reviews = reviews;
            }

            res.send(result);
        });

        // http://localhost:3000/rooms/top-rated
        app.get('/rooms/top-rated', async (req, res) => {
            const result = await roomsCollection.find().toArray();

            // bad way to aggregate data
            for (const room of result) {
                const roomId = room._id.toString();
                const reviews = await reviewsCollection.find({ roomId }).toArray();
                room.reviews = reviews;
                // calculate average rating
                if (reviews.length > 0) {
                    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
                    room.averageRating = total / reviews.length;
                } else {
                    room.averageRating = 0;
                }
            }
            // sort by average rating, descending-topRated ,can not use sort in mongodb because averageRating is not stored in db
            const sorted = result.sort((a, b) => b.averageRating - a.averageRating);
            const finalResult = sorted.slice(0, 6);

            res.send(finalResult);
        });

        // http://localhost:3000/rooms/692488a0e12a55856d20a9ea
        app.get('/rooms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const room = await roomsCollection.findOne(query);
            const roomId = id.toString()
            const reviews = await reviewsCollection.find({ roomId: roomId }).toArray();
            room.reviews = reviews;
            res.send(room);
        });


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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