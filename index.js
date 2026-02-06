require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// MongoDB connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster033.bpxhzqh.mongodb.net/?appName=Cluster033`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]

    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.decoded = decoded
        next()
    } catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}

const verifyTokenEmail = (req, res, next) => {
    if (req.query.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next()
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const roomsCollection = client.db('royalVille').collection('rooms');
        const reviewsCollection = client.db('royalVille').collection('reviews');
        const bookingCollection = client.db('royalVille').collection('bookings');

        // http://localhost:3000/rooms
        // http://localhost:3000/rooms?min=2&max=222&sort=asc
        // http://localhost:3000/sort=asc
        // http://localhost:3000/rooms?email=bibimariyamnavila@gmail.com
        // http://localhost:3000/rooms?userName=Owen%20Sanchez
        app.get('/rooms', async (req, res) => {
            const email = req.query.email;
            const userName = req.query.userName;
            const { min, max } = req.query;

            let query = {};

            if (min && max) {
                query.pricePerNight = { $gte: parseInt(min), $lte: parseInt(max) };
            }

            const sortOrder = req.query.sort;

            const sortOptions = {};
            if (sortOrder === 'asc') {
                sortOptions.pricePerNight = 1; // Ascending order
            } else if (sortOrder === 'desc') {
                sortOptions.pricePerNight = -1; // Descending order
            }

            // if (email) {
            //     query['customersDetails.customer_email'] = email;
            // }
            // if (userName) {
            //     query['reviews.username'] = userName;
            // }

            const cursor = roomsCollection.find(query).sort(sortOptions);
            let result = await cursor.toArray();

            // bad way to aggregate data
            for (const room of result) {
                const roomId = room._id.toString();
                room.reviews = await reviewsCollection.find({ roomId }).toArray();
                room.customersDetails = await bookingCollection.find({ roomId }).toArray();

            }

            if (email) {
                result = result.filter(room =>
                    room.customersDetails.some(details => details.customer_email === email)
                );
            }

            if (userName) {
                result = result.filter(room =>
                    room.reviews.some(details => details.username === userName)
                );
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
            if (!room) {
                return res.status(404).send({ message: 'Room not found' });
            }
            const roomId = id.toString()
            const reviews = await reviewsCollection.find({ roomId: roomId }).toArray();
            room.reviews = reviews;
            const bookings = await bookingCollection.find({ roomId: roomId }).toArray();
            room.customersDetails = bookings;
            res.send(room);
        });

        app.patch('/rooms/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedRoom = req.body;
            const updateDoc = {
                $set: {
                    availability: updatedRoom.availability,
                    // customerDetails: [
                    //     {
                    //         customer_email: updatedRoom.customer_email,
                    //         customer_name: updatedRoom.customer_name,
                    //         checkInDate: updatedRoom.checkInDate,
                    //         checkOutDate: updatedRoom.checkOutDate,
                    //         specificBookedDates: updatedRoom.specificBookedDates,
                    //     }
                    // ],
                    disabledDates: updatedRoom.disabledDates,
                },
            };
            const result = await roomsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.get('/reviews', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })

        app.get('/bookings', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const result = await bookingCollection.find().toArray();
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // const roomId = booking.roomId;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.patch('/bookings/:id', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            const updateDoc = {
                $set: {
                    checkInDate: updatedBooking.checkInDate,
                    checkOutDate: updatedBooking.checkOutDate,
                    specificBookedDates: updatedBooking.specificBookedDates
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
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