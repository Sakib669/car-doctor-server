const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');


// middleware
app.use(cors());
app.use(express.json());


//CarMaster
//L8b9hmi3kurou95C

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wdjom0q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const x = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Authorization required' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'Authorization required' });
        }
        authorization.decode = decode;
        next();
    })
}

const verifyJWT = (req, res, next) => {
    console.log('hitting verify JWT');
    // console.log(req.headers.authorization);
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    console.log('token inside verify JWT ', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('CarDoctor').collection('services');
        const bookingsCollection = client.db('CarDoctor').collection('bookings');


        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(user);
            console.log(token);
            res.send({ token });
        })


        // services

        app.get('/services', async (req, res) => {
            const sort = req.query.sort;
            const search = req.query.search;
            console.log(search);
            // const query = {};
            const query = {title: {$regex: search, $options: 'i'}
        };
            const options = {
                // sort returned documents in ascending order by title (A->Z)
                sort: { "price": sort === 'asc' ? 1 : -1 },
            };
            const cursor = serviceCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                // Include only the `title` and `imdb` fields in each returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        // bookings

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status,
                },
            };
            const result = await bookingsCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            // console.log(req.query.email);
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: 1, message: 'forbidden access' });
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

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
    res.send('Doctor is running!');
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})