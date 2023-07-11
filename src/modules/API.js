const express = require('express');

const puppeteer = require('puppeteer');

const admin = require('firebase-admin');

const { load } = require("cheerio");

admin.initializeApp({
    credential: admin.credential.cert(require("../../service.json")),
});

const app = express();

app.use(express.json());

function zipObject(keys, values) {
    return keys.reduce((acc, key, i) => {
        acc[key] = values[i]
        return acc
    }, {})
}

function chunk(array, n) {
    return array.reduce((acc, val, i) => {
        if (i % n === 0) {
            acc.push([val])
        } else {
            acc[acc.length - 1].push(val)
        }
        return acc
    }, [])
}

module.exports = class API {
    constructor(client) {
        this.client = client;

        this.name = 'api';
    }

    async start() {
        this.client.API = this;

        this.launch = await puppeteer.launch({
            executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
            slowMo: 10,
        }).then(p => {
            this.client.log('Puppeteer iniciado com sucesso', { tags: ['Puppeteer'], color: 'green' });

            return p
        });

        app.listen(25566, () => {
            console.log('API started on port 3000');
        });

        app.get("/politicas", async (req, res) => {
            return res.sendFile("politicas.html", {
                root: `/Users/megawin/Desktop/paulo/bot_wpp`
            })
        })

        app.get("/calendario", async (req, res) => {
            const { user, password } = req.query;

            const initialPage = await this.launch.newPage();

            await initialPage.goto('https://suap.ifbaiano.edu.br/accounts/login/');

            await initialPage.waitForSelector('#id_username');

            await initialPage.type('#id_username', user);

            await initialPage.type(".password-input", password);

            await initialPage.click("body > div.holder > main > div > div:nth-child(1) > form > div.submit-row > input");

            await initialPage.waitForSelector("body > div > a.toggleSidebar");

            let $ = load(await initialPage.content());

            const link = $('a:contains(" Calendário Completo")').attr("href")

            await initialPage.goto(`https://suap.ifbaiano.edu.br${link}`);

            await initialPage.waitForSelector("#content > div.calendarios-container");

            const response = [];

            $ = load(await initialPage.content());

            await Promise.all($("#content > div.calendarios-container").map((i, ul) => {
                return Promise.all($(ul).find("div.calendario").map(async (i, div) => {
                    return new Promise(async resolve => {
                        const p = await initialPage.$(`#content > div.calendarios-container > div:nth-child(${i + 1})`);

                        const shot = await p.screenshot({
                            type: "png",
                            encoding: "base64",
                        });

                        response.push({
                            buffer: shot,
                            indice: i
                        });

                        resolve(true)
                    })
                }))
            })).then(e => {

                initialPage.close();

                return res.json(response)
            })
        })

        app.get("/config", async (req, res) => {
            let { user, password, token } = req.body;

            user = user.toLowerCase();

            const Users = this.client.database.getCollection("users");

            const u = Users.get(us => us.user === user) || Users.create({
                user,
                password,
                postToken: token
            })

            if (u.save) {
                u.password = password;
                u.postToken = token;

                u.save();
            }

            res.send({
                status: true
            })
        })

        app.get("/notificacoes", async (req, res) => {
            const { user, password } = req.query;

            const initialPage = await this.launch.newPage();

            await initialPage.goto('https://suap.ifbaiano.edu.br/accounts/login/');

            await initialPage.waitForSelector('#id_username');

            await initialPage.type('#id_username', user);

            await initialPage.type(".password-input", password)

            await initialPage.click("body > div.holder > main > div > div:nth-child(1) > form > div.submit-row > input");

            await initialPage.waitForSelector("body > div > a.toggleSidebar");

            await initialPage.goto("https://suap.ifbaiano.edu.br/comum/notificacoes/");

            await initialPage.waitForSelector("#content > div.list-articles > ul");

            let $ = load(await initialPage.content());

            const response = [];

            $("#content > div.list-articles > ul").each((i, ul) => {
                $(ul).find("li").each((i, li) => {
                    const selec = $(li).find("a");

                    const selectP = $(selec).find("p");

                    const selectH = $(selec).find("h4");

                    response.push({
                        titulo: $(selectH).text(),
                        fields: selectP.toArray().map((el) => $(el).text().replace(/\s+/g, " "))
                    })
                })
            });

            initialPage.close();

            return res.json(response.filter(r => r.titulo));
        })

        app.get("/campus", async (req, res) => {
            const { campus } = req.query;

            const format = {
                "TDF": "teixeira",
                "GUA": "guanambi",
                "ITB": "itapetinga",
                "ITN": "itaberaba",
                "CAT": "catu",
                "BOM": "lapa",
                "SEN": "bonfim",

            };

            const selected = format[campus];

            const initialPage = await this.launch.newPage();

            await initialPage.goto(`https://www.ifbaiano.edu.br/unidades/${selected}/`);

            await initialPage.waitForSelector("#my-slider > div > ol");

            let $ = load(await initialPage.content());

            const response = [];

            $('#my-slider > div > ol').each((i, ul) => {

                $(ul).find("h1").each((i, h1) => {
                    const selec = $(h1).find("A");

                    response.push({
                        nome: $(selec).text(),
                        site: $(selec).attr("href")
                    })
                });

                $(ul).find("IMG").each((i, img) => {
                    response[i].link = $(img).attr("src");
                })
            });

            initialPage.close();

            return res.json(response);
        })
        app.get("/notas", async (req, res) => {
            const { user, password, ano, periodo, codigo } = req.query;

            const initialPage = await this.launch.newPage();

            await initialPage.goto('https://suap.ifbaiano.edu.br/accounts/login/');

            await initialPage.waitForSelector('#id_username');

            await initialPage.type('#id_username', user);

            await initialPage.type(".password-input", password)

            await initialPage.click("body > div.holder > main > div > div:nth-child(1) > form > div.submit-row > input");

            await initialPage.waitForSelector("body > div > a.toggleSidebar");

            await initialPage.goto(`https://suap.ifbaiano.edu.br/edu/aluno/${user.toUpperCase()}/?tab=boletim&ano_periodo=${ano}_${periodo}`, { waitUntil: 'networkidle2', timeout: 0 });

            let $ = load(await initialPage.content());

            const href = $(`tr:has(> td:contains("${codigo}")) > td > a`).attr(
                "href"
            );

            await initialPage.goto(`https://suap.ifbaiano.edu.br${href}`, { waitUntil: 'networkidle2', timeout: 0 });

            $ = load(await initialPage.content());

            const teachers = $("#content > div:nth-child(3) > div").text()

            const titles = $("#content > div:nth-child(4) > div > h4")
                .toArray()
                .map((el) => $(el).text().replace(/\s+/g, " "))

            const data = $("#content > div:nth-child(4) > div > table")
                .toArray()
                .map((el) => {
                    const $el = $(el)
                    const data = $el
                        .find("td")
                        .toArray()
                        .map((el) => $(el).text())
                    const result = []
                    chunk(data, 5).forEach((chunk) => {
                        result.push({
                            Sigla: chunk[0],
                            Tipo: chunk[1],
                            Descrição: chunk[2],
                            Peso: chunk[3],
                            "Nota Obtida": chunk[4]
                        })
                    })
                    return result
                })

            initialPage.close();

            return res.send({
                Professores: teachers.trim(),
                "Detalhamento das Notas": zipObject(titles, data)
            })
        });

        app.get("/docs", async (req, res) => {

            const { user, password } = req.query;

            const initialPage = await this.launch.newPage();

            await initialPage.goto('https://suap.ifbaiano.edu.br/accounts/login/');

            await initialPage.waitForSelector('#id_username');

            await initialPage.type('#id_username', user);

            await initialPage.type(".password-input", password)

            await initialPage.click("body > div.holder > main > div > div:nth-child(1) > form > div.submit-row > input");

            await initialPage.waitForSelector("body > div > a.toggleSidebar");

            await initialPage.goto(`https://suap.ifbaiano.edu.br/edu/aluno/${user.toUpperCase()}`, { waitUntil: 'networkidle2', timeout: 0 });

            const $ = load(await initialPage.content());

            const documents = $(
                "#content > div.title-container > div.action-bar-container > ul > li:nth-child(2) > ul > li > a"
            ).toArray()
                .map((el) => {

                    const $el = $(el)
                    return {
                        nome: $el.text(),
                        link: $el.attr("href")
                    }
                });
            initialPage.close()
            res.send({
                status: true,
                data: documents
            })
        })

        app.post('/postToken', async (req, res) => {

            let { user, password, token } = req.body;

            user = user.toLowerCase();

            const Users = this.client.database.getCollection("users");

            const u = Users.get(us => us.user === user) || Users.create({
                user,
                password,
                postToken: token
            })

            if (u.save) {
                u.password = password;
                u.postToken = token;

                u.save();
            }

            res.send({
                status: true
            })
        })
    }

    async postNotification({ user, title, body }) {

        user.user = user.user.toLowerCase();

        const dbUSER = this.client.database.getCollection("users").get(u => u.user === user.user);

        if (!dbUSER.postToken) return;

        const message = {
            notification: {
                title,
                body,
            },
            token: dbUSER.postToken,
        };

        console.log(message)
        admin.messaging().send(message)
            .then((response) => {
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {

            });
    }
}