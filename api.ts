import express from 'express';
import { buyProduct, fetchExpendituresHistory, fetchUserScore } from './db';
import { sign } from './jwt';
import fetch from 'node-fetch';
import btoa from 'btoa';
import cors from 'cors';
import jwt from 'express-jwt';
import products from './products';
import client from './';
import { MessageEmbed, TextChannel } from 'discord.js';

declare global {
    interface ParsedToken {
        userID: string;
    }
  
    namespace Express {
        interface Request {
            auth?: ParsedToken
        }
    }
}

const app = express();
const port = process.env.API_PORT;

interface LoginResponse {
    userData: any|null;
    scoreData: any|null;
    history: any|null;
    products: any;
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/update', jwt({ secret: process.env.PRIVATE_KEY! as string, algorithms: ['HS256'], requestProperty: 'auth' }), async (req, res) => {
    const userID = req.auth?.userID as string;
    const score = await fetchUserScore(userID);
    const history = await fetchExpendituresHistory(userID);
    res.send({
        scoreData: score,
        history,
        products
    });
});

app.post('/buy', jwt({ secret: process.env.PRIVATE_KEY! as string, algorithms: ['HS256'], requestProperty: 'auth' }), async (req, res) => {

    console.log(req.auth?.userID + ' is buying something')

    const productID = req.body.productID;
    const emailAddress = req.body.emailAddress;

    if (!productID || !emailAddress) {
        return res.send({
            error: true
        });
    }
    const product = products.find((product) => product.id === productID);

    if (!product) {
        return res.send({
            error: true,
            message: 'Product not found'
        });
    }

    const userID = req.auth?.userID as string;
    const score = await fetchUserScore(userID);
    
    console.log(`Points: ${score.points} Required points: ${product?.points!}`)
    if (score.points < product?.points!) {
        return res.send({
            error: true,
            message: 'Not enough points'
        });
    }

    const transactionConfirmed = await buyProduct(userID, product?.id!, new Date().toISOString(), product?.points!, req.body.emailAddress);

    console.log('Transaction confirmed: '+transactionConfirmed);
    if (!transactionConfirmed) {
        return res.send({
            error: true,
            message: 'Not enough points'
        });
    }

    const newScore = await fetchUserScore(userID);
    const newHistory = await fetchExpendituresHistory(userID);

    const user = await client.users.fetch(userID);
    const embed = new MessageEmbed()
        .setAuthor(user.tag, user.displayAvatarURL())
        .setDescription(`A new payment is pending your approval ✅`)
        .addField('User ID', userID)
        .addField('User email', emailAddress)
        .addField('User points', score.points)
        .addField('Product price', product?.paypal)
        .addField('Points paid by the user', product.points)
        .addField('Status', 'Processing... (react to approve)')
        .setColor('RED');
    (client.channels.cache.get(process.env.TRANSACTION_CHANNEL!)! as TextChannel).send(embed).then((m) => {
        m.react('✅');
    });

    return res.send({
        scoreData: newScore,
        history: newHistory
    });

});

app.get('/history', jwt({ secret: process.env.PRIVATE_KEY! as string, algorithms: ['HS256'], requestProperty: 'auth' }), async (req, res) => {
    const userID = req.auth?.userID!;

    fetchExpendituresHistory(userID).then((history) => {
        res.send({
            data: history
        });
    });
});

app.get('/auth/login', async (req, res) => {

    console.log('Login request received with code ', req.query.code);

    const code = req.query.code as string;
    if (!code) return res.send({
        error: true
    });

    const response: LoginResponse = {
        userData: null,
        scoreData: null,
        history: null,
        products
    };

    const tokenParams = new URLSearchParams();
	tokenParams.set("grant_type", "authorization_code");
	tokenParams.set("code", code);
	tokenParams.set("redirect_uri", process.env.REDIRECT_URI as string);
	const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		body: tokenParams.toString(),
		headers: {
			Authorization: `Basic ${btoa(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`)}`,
			"Content-Type": "application/x-www-form-urlencoded"
		}
	});
    const tokenData = await tokenResponse.json();
    if (tokenData.error || !tokenData.access_token) {
        return res.send({
            error: true
        });
    }
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("http://discordapp.com/api/users/@me", {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const userData = await userResponse.json();
    response.userData = {
        ...userData,
        avatarURL: 'https://cdn.discordapp.com/' + (userData.avatar ? `avatars/${userData.id}/${userData.avatar}.webp` : `embed/avatars/${userData.discriminator % 5}.png`)
    };

    response.scoreData = await fetchUserScore(userData.id);
    response.history = await fetchExpendituresHistory(userData.id);

    console.log('Login request responded');
    return res.send({
        error: false,
        jwt: sign({ userID: userData.id }),
        data: response
    });

});

app.listen(port, () => {
    console.log(`API is listening on ${port}`);
});
