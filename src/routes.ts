import express, { Request, Response, text} from 'express';
import { parseInTheNews, getSlackAccessToken, formatLinksForSlack, postToSlack, postNewsToSlack } from './helpers';
import { TypeformAnswer, TypeformFormResponse, SlackAccessTokenRequest } from './types';
import { ObjectID } from 'mongodb';
import axios from 'axios';

export const router = express.Router();

router.post('/slack', async (req: Request, res: Response) => {
    
    const data:SlackAccessTokenRequest = {
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code: req.body.code,
        redirect_uri: `${process.env.WEB_URL}/redirected`
    }

    // Grab an access token.
    const accessToken = await getSlackAccessToken(data);
    if (accessToken.ok) {
        const teamCollection = req.db.collection('teams')
        const team = {
             ...accessToken
        }
        teamCollection.updateOne(
            { 'team.id': accessToken.team.id }, 
            { $set: team }, 
            { upsert: true }
        ).then(() => {
            res.json({
                team: accessToken.team,
                channel: {
                    name: accessToken.incoming_webhook.channel
                }
            })
        })
    }
});

router.post('/typeform/:teamId', async (req: Request, res: Response) => {
    
    // Find the slack token for the team.
    const teamCollection = req.db.collection('teams')
    const team = await teamCollection.findOne({ 'team.id': req.params.teamId });
    
    // Grab the email that was submitted from Typeform.
    let email;
    const formResponse:TypeformFormResponse = req.body.form_response;
    const emailAnswer = formResponse.answers.find((answer) => {
        return answer.type === 'email'
    });
    if (emailAnswer && emailAnswer.email) {
        // We have an email from the Typeform submission.
        email = emailAnswer.email;
    }

    /**
     * Post the news to Slack. Not awaiting here on purpose
     * as a way to just run the process in the background and 
     * not hold up the webhook response.
     */
    const triggeredBy = email ? `Triggered by ${email}'s form submission` : null;
    postNewsToSlack(team.incoming_webhook.url, triggeredBy);

    res.json({ ok : true });
});

router.get('/', async (req: Request, res: Response) => {
    const dbStats = await req.db.stats();
    res.json({
        ok: true,
        db: {
            ok: !!dbStats.ok
        }
    })
});