const { readdirSync } = require('fs');

const Simpl = require('simpl.db');

module.exports = class Client {

    constructor() {
        this.eventsToListen = ['onAnyMessage'];

        this.commands = new Map();

        this.events = new Map();

        this.messageCollectors = new Map();

        this.modules = {};
    }

    async log(args) {
        console.log(args)
    };

    async login() {
        return this;
    };

    async loadModules() {
        const modules = readdirSync('src/modules/');

        modules.forEach(file => {
            const module = require(`../modules/${file}`);

            this.log(`[MODULES] - Módulo ${file} carregado`, { color: 'yellow' });

            const m = new module(this);

            m.start();

            this.modules[m.name] = m;
        })
    }

    async connectdatabase() {
        this.database = new Simpl();

        if (!this.database.getCollection('users')) this.database.createCollection('users');

        const firebase = require('firebase');

        firebase.initializeApp({
            apiKey: process.env.FIREBASE_API,
            authDomain: process.env.FIREBASE_DOMAIN,
            projectId: process.env.FIREBASE_PROJECTID,
            storageBucket: PROCESS.env.FIREBASE_STORAGE,
            messagingSenderId: process.env.FIREBASE_MESSAGING,
            appId: process.env.FIREBASE_APPID,
            measurementId: process.env.FIREBASE_MEASURE
        });

        this.firebase = firebase.database();

        return this.log(`[FIREBASE] - Firebase conectado com sucesso.`, { tags: ['Banco de dados'], color: 'green' })
    };
}