const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors())


app.get('/', (req, res) => {
    res.send("Assainment 12 server is running")
})

app.listen(port, () => {
    console.log('assainment 12 server is running')
})

const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send("protomei error khaiso")
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.USER_JWT, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbiden access" })
        }
        req.decoded = decoded;
        // console.log('supply decoded', req.decoded)
        next()
    })
}

const uri = `mongodb+srv://${process.env.USER_SECRET_name}:${process.env.USER_SECRET_pass}@cluster0.di4ojvf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        //Db collection
        const productsCollection = client.db('MobileLy').collection("products");
        const users = client.db('MobileLy').collection("users");
        const bookingCollection = client.db('MobileLy').collection("booked");

        //verify For admin 
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const filter = { email: decodedEmail };
            const result = await users.findOne(filter);
            if (result.title !== 'admin') {
                return res.status(403).send({ message: "Sorry Bro You ar not Admin" })
            }
            next();
        }

        //const verify Seller
        const verifyseller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const filter = { email: decodedEmail };
            const result = await users.findOne(filter);
            if (result.title !== 'seller') {
                return res.status(403).send({ message: "Sorry Bro you are not Seler" })
            }
            next();
        }

        //jwt Token
        app.get('/jwt', async (req, res) => {
            const userMail = req.query.email;
            const query = { email: userMail };
            const user = await users.findOne(query);
            if (user) {
                const token = jwt.sign({ userMail }, process.env.USER_JWT, { expiresIn: '24h' });
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: "Abar login koro. token ar meyad nai" })
        })


        // all Get Method 
        app.get('/products/:id', async (req, res) => {
            const category = req.params.id;
            const result = await productsCollection.find({ categoryId: category }).toArray();
            res.send(result)
        })


        //All selers 
        app.get('/allsellers', async (req, res) => {
            const result = await users.find({ title: 'seller' }).toArray();
            res.send(result);
        })

        //all Buyers
        app.get('/allbuyers', async (req, res) => {
            const result = await users.find({ title: 'buyer' }).toArray();
            res.send(result)
        })



        //Add Post method
        app.post('/users', async (req, res) => {
            const data = req.body;
            const result = await users.insertOne(data);
            res.send(result)
        })

        app.post('/addproduct', async (req, res) => {
            const data = req.body;
            const result = await productsCollection.insertOne(data);
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const data = req.body;
            const result = await bookingCollection.insertOne(data);
            res.send(result)
        })

        //Add Put method

    }
    finally {

    }
}
run().catch(err => console.log(err))