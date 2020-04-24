import * as dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import MongoClient, { Db } from 'mongodb';
import cors from 'cors';
import helmet from 'helmet';
import { router }  from './routes';
import { makeCronJob } from './helpers';

dotenv.config();

if (!process.env.PORT) {
    process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

declare const module: any;

/**
 * Custom middleware to add a connected MongoDB dB instance
 * to the request.
 */
declare module 'express-serve-static-core' {
    interface Request {
        db: MongoClient.Db
    }
}
function mongo(db: MongoClient.Db) {
    return (req:Request, res: Response, next: NextFunction) => {
        req.db = db;
        next();
    }
}

MongoClient.connect(process.env.MONGO_URL || '', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err, client) => {

    const db   = client.db(process.env.MONGO_DB || '');
    const cron = makeCronJob(db)

    // Start cron
    cron.start();

    // Start API
    app.use(mongo(db));
    app.use(router);
    const PORT: number = parseInt(process.env.PORT as string, 10);
    const server = app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });

    /**
     * Hot Module Replacement
     * https://webpack.js.org/guides/hot-module-replacement/
     */
    if (module.hot) {
        module.hot.accept();
        module.hot.dispose(() => {
            server.close()
            cron.stop();
        });
     }
});






