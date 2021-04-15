import express from 'express';
import { fetchUserScore } from './db';
import { sign } from './jwt';
import fetch from 'node-fetch';
import btoa from 'btoa';
import cors from 'cors';
import jwt from 'express-jwt';

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
};

app.use(cors());

app.get('/score', jwt({ secret: process.env.PRIVATE_KEY! as string, algorithms: ['HS256'], requestProperty: 'auth' }), async (req, res) => {
    const userID = req.auth?.userID as string;
    const score = await fetchUserScore(userID);
    console.log(score)
    res.send(score);
});

app.get('/auth/login', async (req, res) => {

    const code = req.query.code as string;
    if (!code) return res.send('Please retry!');

    const response: LoginResponse = {
        userData: null,
        scoreData: null
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

    return res.send({
        error: false,
        jwt: sign({ userID: userData.id }),
        data: response
    });

});

app.listen(port, () => {
    console.log(`API is listening on ${port}`);
});
