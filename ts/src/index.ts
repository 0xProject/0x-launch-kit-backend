import * as express from "express";
const app = express();
const port = 3000;

app.get("/", (_: express.Request, res: express.Response) => res.send("Hello World!"));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`); // tslint:disable-line:no-console
});
