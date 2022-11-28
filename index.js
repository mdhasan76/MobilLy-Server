const express = require('express');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_key);
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



const uri = `mongodb+srv://${process.env.USER_SECRET_name}:${process.env.USER_SECRET_pass}@cluster0.di4ojvf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
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


const run = async () => {
    try {
        //Db collection
        const productsCollection = client.db('MobileLy').collection("products");
        const users = client.db('MobileLy').collection("users");
        const bookingCollection = client.db('MobileLy').collection("booked");
        const reportedItems = client.db('MobileLy').collection("reportitem");
        const paymentsCollection = client.db('MobileLy').collection("payments");
        const advertizesCollection = client.db('MobileLy').collection("advertize");

        //verify For admin 
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail)
            const filter = { email: decodedEmail };
            const result = await users.findOne(filter);
            console.log(result)
            if (result.title !== 'admin') {
                return res.status(403).send({ message: "Sorry Bro You are not Admin" })
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
            res.status(403).send({ accessToken: "" })
        })


        // all Get Method 
        app.get('/products/:id', async (req, res) => {
            const category = req.params.id;
            const result = await productsCollection.find({ categoryId: category }).toArray();
            res.send(result)
        })

        app.get('/myorders', verifyjwt, async (req, res) => {
            const userEmail = req.query.email;
            const decodedEmail = req.decoded.userMail;
            if (userEmail !== decodedEmail) {
                return res.status(403).send({ message: "Batpari koira lab nai" })
            }
            const query = { email: userEmail };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/reportitems', async (req, res) => {
            const result = await reportedItems.find({}).toArray()
            res.send(result)
        })

        app.get('/dashboard/myproducts/:email', async (req, res) => {
            const userEmail = req.params.email;
            const query = { email: userEmail };
            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const id = req.params.email;
            const query = { email: id };
            const user = await users.findOne(query);
            res.send({ isAdmin: user?.title === "admin" })
        })
        app.get('/users/seller/:email', async (req, res) => {
            const uEmail = req.params.email;
            const query = { email: uEmail };
            const user = await users.findOne(query);
            res.send({ isSeller: user?.title === "seller" })
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

        app.get('/booked/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })


        //Add Post method
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/paymentConfirm', async (req, res) => {
            const data = req.body;
            const result = await paymentsCollection.insertOne(data);
            const bookedUpdate = { _id: ObjectId(data.bookingId) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    paid: true
                }
            };
            const updateBookedPaid = await bookingCollection.updateOne(bookedUpdate, updatedDoc, options);
            const productUpdate = { _id: ObjectId(data.productId) };
            const productResult = await productsCollection.updateOne(productUpdate, updatedDoc, options)
            res.send(result)
        })

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

        app.post('/reportitem', async (req, res) => {
            const data = req.body;
            const result = await reportedItems.insertOne(data);
            res.send(result)
        })


        //All put & update method
        app.put('/verifyseller/:email', async (req, res) => {
            const sellerEmail = req.params.email;
            const filter = { email: sellerEmail };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: true,
                }
            }
            const productSellerVfd = await productsCollection.updateMany(filter, updatedDoc, options);
            const result = await users.updateOne(filter, updatedDoc, options);
            res.send(result)
        })

        app.put('/advertize/:id', async (req, res) => {
            const id = req.params.id;
            const product = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertize: true,
                }
            }
            const result = await productsCollection.updateOne(product, updatedDoc, options);
            res.send(result)
        })


        //All Delete method
        app.delete('/allbuyers/:id', async (req, res) => {
            const id = req.params.id;
            const result = await users.deleteOne({ _id: ObjectId(id) })
            res.send(result)
        })

        app.delete('/allsellers/:id', verifyjwt, async (req, res) => {
            const decodedEmail = req.decoded.userMail;
            const query = { email: decodedEmail };
            const user = await users.findOne(query);
            if (user?.title !== 'admin') {
                return res.status(403).send({ message: "Tomi Admin na vai" })
            }
            const id = req.params.id;
            const result = await users.deleteOne({ _id: ObjectId(id) })
            res.send(result)
        })

        app.delete('/deleteReportItem/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const reportQuery = { itemId: id };
            const filter = await productsCollection.deleteOne(query);
            const reportItem = await reportedItems.deleteOne(reportQuery);
            res.send(filter)
        })

        app.delete('/myproducts/:id', async (req, res) => {
            const id = req.params.id;
            const result =
                await productsCollection.deleteOne({ _id: ObjectId(id) });
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(err => console.log(err))