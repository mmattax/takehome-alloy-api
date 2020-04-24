import axios from 'axios';
import cheerio from 'cheerio';
import querysting from 'querystring';
import { Link, SlackAccessTokenRequest } from './types';
import qs from 'qs';
import moment from 'moment';
import { Db } from 'mongodb';
import { CronJob } from 'cron';

/**
 * Builds a cron job to post the news to Slack teams at 9AM PT
 * @param db 
 */
export function makeCronJob(db: Db): CronJob {
    return new CronJob('0 0 9 * * *', () => {
        const teamCollection = db.collection('teams')
        const teams = teamCollection.find().forEach(team => {
            const webhookUrl = team.incoming_webhook.url;
            postNewsToSlack(webhookUrl, 'Sent by the cron');
        });
    }, null, true, 'America/Los_Angeles');
}

/**
 * Get's an access token from Slack, using the v2 "Add to Slack" flow.
 * https://api.slack.com/methods/oauth.v2.access
 * @param data 
 */
export async function getSlackAccessToken(data: SlackAccessTokenRequest): Promise<any> {
    const url = 'https://slack.com/api/oauth.v2.access';
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
    const res = await axios.post(
        url,
        qs.stringify(data),
        config
    );
    return res.data;
}

/**
 * Post new items to Slack
 * @param webhookUrl 
 * @param triggeredBy 
 */
export async function postNewsToSlack(webhookUrl: string, triggeredBy: string | null) {
    parseInTheNews().then(news => {
        const text = 'In the news: ' + moment().format('LL');
        const blocks: any = [{
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${text}*`
            }
        }];
        if (triggeredBy !== null) {
            blocks.push({
                type: 'context',
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": triggeredBy
                    }
                ]
            });
        }
        blocks.push(...formatLinksForSlack(news))
        return postToSlack(webhookUrl, text, blocks);
    });
}

/**
 * Posts a message to Slack using an incoming Webhook.
 * @param webhookUrl 
 * @param text 
 * @param blocks 
 */
export async function postToSlack(webhookUrl: string, text: string, blocks: Array<any> = []) {
    const data: any = { text: text };
    if (blocks.length) {
        data.blocks = blocks;
    }
    return axios.post(webhookUrl, data).catch(err => {
        console.log(err);
    })
}

/**
 * Formats an array of links into Slack's Bloc Kit layout.
 * @param links 
 */
export function formatLinksForSlack(links: Link[]) {
    return links.map(link => ({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `:rolled_up_newspaper: ${link.label}`,
        },
        accessory: {
            type: 'button',
            text: {
                type: 'plain_text',
                text: 'View'
            },
            value: link.url,
            url: link.url
        }
    }));
}

/**
 * Scrapes Wikipedia's "In the News" section from the main page into 
 * an array of Links.
 */
export async function parseInTheNews(): Promise<Link[]> {

    // Grab the HTML
    const url = 'https://en.wikipedia.org/wiki/Main_Page'
    const res = await axios.get(url);

    const $ = cheerio.load(res.data);
    const links: Link[] = [];
    /**
     * Parse the "In the News" section
     * 
     * We're using the child combinator here to avoid picking up 
     * the "Coronavirus pandemic" and the recent death li elements.
     * 
     * The news items currently look like the only direct child of 
     * #mp-itn that's a ul.
     */
    $("#mp-itn > ul").children().each((i, li) => {

        const label = $(li).text();

        const link = $(li).find('a').first()
        const url = `https://en.wikipedia.org${$(link).attr("href")}`

        links.push({
            url: url,
            label: label
        });
    });

    return links;
}
